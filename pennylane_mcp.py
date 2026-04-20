#!/usr/bin/env python3
"""
ComptaMind IA — MCP Server Pennylane
=====================================
Serveur MCP qui connecte l'agent IA directement à l'API Pennylane.
Permet à Claude de lire, analyser et créer des données comptables
dans Pennylane comme un collaborateur humain.

Usage:
    python pennylane_mcp.py

Configuration:
    Définir la variable d'environnement PENNYLANE_TOKEN avant de lancer.
    export PENNYLANE_TOKEN=ton_token_ici
"""

import os
import json
from typing import Optional, List
from enum import Enum
from datetime import datetime

import httpx
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# ─── Initialisation ───────────────────────────────────────────────────────────

mcp = FastMCP("pennylane_mcp")

PENNYLANE_API_BASE = "https://app.pennylane.com/api/external/v2"
PENNYLANE_TOKEN = os.environ.get("PENNYLANE_TOKEN", "")

# ─── Client HTTP partagé ──────────────────────────────────────────────────────

async def _api(endpoint: str, method: str = "GET", params: dict = None, body: dict = None) -> dict:
    """Appel API Pennylane centralisé avec authentification Bearer."""
    headers = {
        "Authorization": f"Bearer {PENNYLANE_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    url = f"{PENNYLANE_API_BASE}/{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method,
            url,
            headers=headers,
            params=params,
            json=body,
        )
        response.raise_for_status()
        return response.json()


def _err(e: Exception) -> str:
    """Formatage d'erreur clair et actionnable."""
    if isinstance(e, httpx.HTTPStatusError):
        code = e.response.status_code
        if code == 401:
            return "Erreur 401 : Token Pennylane invalide ou expiré. Vérifiez PENNYLANE_TOKEN."
        if code == 403:
            return "Erreur 403 : Accès refusé. Vérifiez les permissions de votre token."
        if code == 404:
            return "Erreur 404 : Ressource introuvable. Vérifiez l'identifiant fourni."
        if code == 422:
            detail = e.response.text[:300]
            return f"Erreur 422 : Données invalides. Détail : {detail}"
        if code == 429:
            return "Erreur 429 : Limite de requêtes atteinte. Attendez quelques secondes."
        return f"Erreur API {code} : {e.response.text[:200]}"
    if isinstance(e, httpx.TimeoutException):
        return "Erreur : Délai dépassé. Pennylane ne répond pas. Réessayez."
    return f"Erreur inattendue ({type(e).__name__}) : {str(e)}"


# ─── Modèles d'entrée ─────────────────────────────────────────────────────────

class TransactionInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    page: Optional[int] = Field(default=1, description="Numéro de page (défaut: 1)", ge=1)
    per_page: Optional[int] = Field(default=50, description="Résultats par page (max 100)", ge=1, le=100)
    filter_non_classe: Optional[bool] = Field(default=False, description="Si True, retourne uniquement les transactions non classées")


class ClassifyInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    transaction_id: str = Field(..., description="ID de la transaction à classifier (ex: 'txn_123abc')", min_length=1)
    category_id: str = Field(..., description="ID de la catégorie Pennylane à appliquer", min_length=1)
    label: Optional[str] = Field(default=None, description="Libellé personnalisé pour l'écriture", max_length=200)


class InvoiceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    type: Optional[str] = Field(default="supplier", description="Type de facture : 'supplier' (achat) ou 'customer' (vente)")
    page: Optional[int] = Field(default=1, description="Numéro de page", ge=1)
    per_page: Optional[int] = Field(default=50, description="Résultats par page (max 100)", ge=1, le=100)
    status: Optional[str] = Field(default=None, description="Filtrer par statut : 'draft', 'pending', 'paid'")


class CreateInvoiceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    customer_id: str = Field(..., description="ID du client Pennylane", min_length=1)
    date: str = Field(..., description="Date de la facture au format YYYY-MM-DD (ex: '2025-01-31')")
    deadline: str = Field(..., description="Date d'échéance au format YYYY-MM-DD (ex: '2025-02-28')")
    label: str = Field(..., description="Objet/libellé de la facture", min_length=1, max_length=200)
    amount_ht: float = Field(..., description="Montant HT en euros (ex: 1000.00)", gt=0)
    vat_rate: Optional[float] = Field(default=20.0, description="Taux de TVA en % (ex: 20.0 pour 20%)", ge=0, le=100)


class LedgerInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    page: Optional[int] = Field(default=1, description="Numéro de page", ge=1)
    per_page: Optional[int] = Field(default=50, description="Résultats par page", ge=1, le=100)
    account_number: Optional[str] = Field(default=None, description="Filtrer par numéro de compte PCG (ex: '411', '401', '44571')", max_length=10)
    date_from: Optional[str] = Field(default=None, description="Date de début au format YYYY-MM-DD")
    date_to: Optional[str] = Field(default=None, description="Date de fin au format YYYY-MM-DD")


class CreateLedgerEntryInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    journal_code: str = Field(..., description="Code journal (ex: 'ACH', 'VTE', 'BQ', 'OD')", min_length=1, max_length=10)
    date: str = Field(..., description="Date de l'écriture au format YYYY-MM-DD")
    label: str = Field(..., description="Libellé de l'écriture", min_length=1, max_length=200)
    account_debit: str = Field(..., description="Numéro de compte à débiter (ex: '6011', '44566')", min_length=1)
    account_credit: str = Field(..., description="Numéro de compte à créditer (ex: '401', '512')", min_length=1)
    amount: float = Field(..., description="Montant de l'écriture en euros", gt=0)
    reference: Optional[str] = Field(default=None, description="Référence de la pièce (ex: numéro de facture)", max_length=100)


class BalanceAgeeInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    type: Optional[str] = Field(default="customer", description="Type : 'customer' (clients 411) ou 'supplier' (fournisseurs 401)")
    at_date: Optional[str] = Field(default=None, description="Date de référence au format YYYY-MM-DD (défaut: aujourd'hui)")


class FecInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    date_from: str = Field(..., description="Date de début de l'export FEC au format YYYY-MM-DD (ex: '2024-01-01')")
    date_to: str = Field(..., description="Date de fin de l'export FEC au format YYYY-MM-DD (ex: '2024-12-31')")


class ReminderInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    invoice_id: str = Field(..., description="ID de la facture pour laquelle envoyer la relance", min_length=1)
    message: Optional[str] = Field(default=None, description="Message personnalisé de relance (optionnel)", max_length=1000)


class VatInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    date_from: str = Field(..., description="Date de début de la période TVA au format YYYY-MM-DD (ex: '2025-01-01')")
    date_to: str = Field(..., description="Date de fin de la période TVA au format YYYY-MM-DD (ex: '2025-03-31')")


class CustomerInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    page: Optional[int] = Field(default=1, description="Numéro de page", ge=1)
    per_page: Optional[int] = Field(default=50, description="Résultats par page (max 100)", ge=1, le=100)
    search: Optional[str] = Field(default=None, description="Rechercher par nom ou raison sociale", max_length=100)


# ─── Outils MCP ───────────────────────────────────────────────────────────────

@mcp.tool(
    name="pennylane_get_transactions",
    annotations={
        "title": "Récupérer les transactions bancaires",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_transactions(params: TransactionInput) -> str:
    """
    Récupère les transactions bancaires depuis Pennylane.

    Retourne la liste des transactions avec leur statut de classification.
    Utilisez filter_non_classe=True pour ne voir que les transactions
    en attente de catégorisation (filtrage côté Python car l'API v2
    ne supporte pas le filtre is_categorized).

    Args:
        params (TransactionInput):
            - page (int): Numéro de page (défaut: 1)
            - per_page (int): Résultats par page, max 100 (défaut: 50)
            - filter_non_classe (bool): Si True, uniquement les non classées

    Returns:
        str: JSON avec la liste des transactions et métadonnées de pagination.

    Exemples d'utilisation:
        - "Montre-moi les transactions non classées" -> filter_non_classe=True
        - "Liste toutes les transactions de cette semaine"
        - "Y a-t-il des transactions en attente de validation ?"
    """
    try:
        # Pennylane v2 : utiliser "limit" au lieu de "per_page"
        query_params = {"page": params.page, "per_page": params.per_page}
        # Note: pas de filtre is_categorized en v2 — on filtre côté Python

        data = await _api("transactions", params=query_params)

        transactions = data.get("items", data.get("transactions", data.get("bank_transactions", data.get("data", []))))
        has_more = data.get("has_more", False)
        next_cursor = data.get("next_cursor", None)

        # Filtrage client-side : non classée = categories vide ET pas de matched_invoices
        def is_non_classe(t):
            cats = t.get("categories", [])
            matched = t.get("matched_invoices", {})
            # matched_invoices peut être un dict ou une liste selon la version
            if isinstance(matched, dict):
                has_match = bool(matched.get("customer_invoices") or matched.get("supplier_invoices"))
            elif isinstance(matched, list):
                has_match = len(matched) > 0
            else:
                has_match = False
            return len(cats) == 0 and not has_match

        if params.filter_non_classe:
            transactions = [t for t in transactions if is_non_classe(t)]

        result = {
            "count": len(transactions),
            "has_more": has_more,
            "next_cursor": next_cursor,
            "transactions": [
                {
                    "id": t.get("id"),
                    "date": t.get("date"),
                    "label": t.get("label"),
                    "amount": t.get("amount"),
                    "currency": t.get("currency", "EUR"),
                    "is_categorized": not is_non_classe(t),
                    "categories": t.get("categories", []),
                    "matched_invoices": t.get("matched_invoices", {}),
                    "outstanding_balance": t.get("outstanding_balance"),
                }
                for t in transactions
            ]
        }
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_plan_items",
    annotations={
        "title": "Récupérer le plan comptable Pennylane (IDs catégories)",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_plan_items(params: dict = None) -> str:
    """
    Récupère les comptes du plan comptable Pennylane avec leurs IDs internes.

    Indispensable pour classify_transaction : permet de trouver le category_id
    correspondant à un compte PCG (ex: 6331, 641, 401...).

    Args:
        params: optionnel — {"search": "6331"} pour filtrer par numéro de compte

    Returns:
        str: Liste des comptes avec id, number, label.

    Exemples d'utilisation:
        - "Quel est l'ID du compte 6331 ?"
        - "Trouve le category_id pour les cotisations sociales"
    """
    try:
        search = (params or {}).get("search", "") if isinstance(params, dict) else ""
        # Endpoint confirmé : GET /api/external/v2/categories
        all_items = []
        cursor = None
        page_count = 0
        while True:
            qp = {"limit": 100}
            if cursor:
                qp["cursor"] = cursor
            if search:
                # Filtre Pennylane v2 : label start_with ou id eq
                qp["filter"] = json.dumps([{"field": "label", "operator": "start_with", "value": search}])
            data = await _api("categories", params=qp)
            items = data.get("items", data.get("categories", []))
            all_items.extend(items)
            page_count += 1
            if not data.get("has_more", False) or page_count >= 10:
                break
            cursor = data.get("next_cursor")
            if not cursor:
                break

        # Formater les résultats
        result = [
            {
                "id": item.get("id"),
                "label": item.get("label") or "",
                "category_group": (item.get("category_group") or {}).get("id"),
                "category_group_label": (item.get("category_group") or {}).get("label", ""),
                "analytical_code": item.get("analytical_code"),
            }
            for item in all_items
            # Filtre côté Python si search fourni
            if not search or search.lower() in (item.get("label") or "").lower()
        ]

        return json.dumps({
            "total": len(result),
            "categories": result[:50],
            "note": "Utiliser 'id' comme category_id dans classify_transaction (weight='1' pour 100%)"
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_classify_transaction",
    annotations={
        "title": "Classifier une transaction bancaire",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    }
)
async def pennylane_classify_transaction(params: ClassifyInput) -> str:
    """
    Classe une transaction bancaire dans une catégorie comptable Pennylane.

    Cette action crée une écriture comptable associée à la transaction.
    Utiliser après avoir récupéré les transactions non classées.

    Args:
        params (ClassifyInput):
            - transaction_id (str): ID de la transaction à classifier
            - category_id (str): ID de la catégorie Pennylane
            - label (str, optionnel): Libellé personnalisé

    Returns:
        str: Confirmation de la classification avec les détails de l'écriture créée.

    Exemples d'utilisation:
        - "Classe cette transaction comme frais de déplacement"
        - "Catégorise ce virement en charges de sous-traitance"
    """
    try:
        # Endpoint confirmé Pennylane v2 : PUT /transactions/{id}/categories
        # Body : tableau de catégories [{id: int, weight: "1"}]
        # weight = proportion (entre 0 et 1, somme = 1 par category_group)
        body = [{"id": int(params.category_id), "weight": "1"}]

        data = await _api(
            f"transactions/{params.transaction_id}/categories",
            method="PUT",
            body=body
        )

        # La réponse est un tableau de catégories appliquées
        categories_applied = data if isinstance(data, list) else data.get("items", data)
        return json.dumps({
            "success": True,
            "message": f"Transaction {params.transaction_id} classée avec succès.",
            "categories_appliquees": categories_applied,
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_invoices",
    annotations={
        "title": "Récupérer les factures",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_invoices(params: InvoiceInput) -> str:
    """
    Récupère les factures clients ou fournisseurs depuis Pennylane.

    Args:
        params (InvoiceInput):
            - type (str): 'supplier' pour achats, 'customer' pour ventes
            - page (int): Numéro de page
            - per_page (int): Résultats par page
            - status (str, optionnel): Filtrer par statut ('draft', 'pending', 'paid')

    Returns:
        str: JSON avec la liste des factures, montants et statuts.

    Exemples d'utilisation:
        - "Quelles factures clients sont en attente de paiement ?"
        - "Liste les factures fournisseurs du mois"
        - "Y a-t-il des factures non payées ?"
    """
    try:
        endpoint = "supplier_invoices" if params.type == "supplier" else "customer_invoices"
        query_params = {"page": params.page, "per_page": params.per_page}
        if params.status:
            query_params["filter[status]"] = params.status

        data = await _api(endpoint, params=query_params)
        # Pennylane v2 retourne les données sous "items" avec pagination par curseur
        invoices = data.get("items", data.get("supplier_invoices", data.get("customer_invoices", data.get("invoices", []))))
        has_more = data.get("has_more", False)
        next_cursor = data.get("next_cursor", None)

        result = {
            "type": params.type,
            "count": len(invoices),
            "has_more": has_more,
            "next_cursor": next_cursor,
            "invoices": [
                {
                    "id": inv.get("id"),
                    "number": inv.get("invoice_number") or inv.get("number"),
                    "date": inv.get("date"),
                    "deadline": inv.get("deadline"),
                    "label": inv.get("label"),
                    "amount_ht": inv.get("amount"),
                    "amount_ttc": inv.get("tax_amount"),
                    "status": inv.get("status"),
                    "entity": (inv.get("supplier") or inv.get("customer") or {}).get("name"),
                }
                for inv in invoices
            ]
        }
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_create_invoice",
    annotations={
        "title": "Créer une facture client",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    }
)
async def pennylane_create_invoice(params: CreateInvoiceInput) -> str:
    """
    Crée une nouvelle facture client dans Pennylane.

    Génère une facture avec calcul automatique de la TVA et du TTC.

    Args:
        params (CreateInvoiceInput):
            - customer_id (str): ID du client dans Pennylane
            - date (str): Date de la facture (YYYY-MM-DD)
            - deadline (str): Date d'échéance (YYYY-MM-DD)
            - label (str): Objet de la facture
            - amount_ht (float): Montant HT en euros
            - vat_rate (float): Taux TVA en % (défaut: 20.0)

    Returns:
        str: Détails de la facture créée avec son numéro et son ID.

    Exemples d'utilisation:
        - "Crée une facture de 2500€ HT pour le client ABC"
        - "Génère une facture de prestation de conseil"
    """
    try:
        vat_amount = round(params.amount_ht * params.vat_rate / 100, 2)
        amount_ttc = round(params.amount_ht + vat_amount, 2)

        body = {
            "invoice": {
                "customer_id": params.customer_id,
                "date": params.date,
                "deadline": params.deadline,
                "label": params.label,
                "amount": params.amount_ht,
                "currency": "EUR",
                "line_items": [
                    {
                        "label": params.label,
                        "quantity": 1,
                        "unit_price": params.amount_ht,
                        "vat_rate": str(params.vat_rate),
                    }
                ]
            }
        }

        data = await _api("customer_invoices", method="POST", body=body)

        return json.dumps({
            "success": True,
            "message": f"Facture créée avec succès — Montant HT: {params.amount_ht}€ / TVA: {vat_amount}€ / TTC: {amount_ttc}€",
            "invoice": data
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_ledger_entries",
    annotations={
        "title": "Récupérer les écritures comptables",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_ledger_entries(params: LedgerInput) -> str:
    """
    Récupère les écritures comptables du grand livre Pennylane.

    Permet de consulter les écritures par compte PCG et par période.
    Indispensable pour la révision comptable et le lettrage.

    Args:
        params (LedgerInput):
            - page (int): Numéro de page
            - per_page (int): Résultats par page
            - account_number (str, optionnel): Compte PCG (ex: '411', '401', '512')
            - date_from (str, optionnel): Date de début (YYYY-MM-DD)
            - date_to (str, optionnel): Date de fin (YYYY-MM-DD)

    Returns:
        str: JSON avec les écritures, montants débit/crédit et soldes.

    Exemples d'utilisation:
        - "Montre-moi les écritures du compte 411 clients"
        - "Quelles sont les écritures TVA du trimestre ?"
        - "Vérifie le solde du compte 512 banque"
    """
    try:
        query_params = {"page": params.page, "per_page": params.per_page}
        # Pennylane v2 : pas de filtre API — on filtre côté Python sur date et compte

        data = await _api("ledger_entries", params=query_params)
        entries = data.get("items", [])

        # Filtrage par date côté Python
        if params.date_from:
            entries = [e for e in entries if e.get("date", "") >= params.date_from]
        if params.date_to:
            entries = [e for e in entries if e.get("date", "") <= params.date_to]
        has_more = data.get("has_more", False)
        next_cursor = data.get("next_cursor", None)
        total_items = data.get("total_items", len(entries))

        result = {
            "total": total_items,
            "count": len(entries),
            "has_more": has_more,
            "next_cursor": next_cursor,
            "filters": {
                "date_from": params.date_from,
                "date_to": params.date_to,
            },
            "entries": [
                {
                    "id": e.get("id"),
                    "date": e.get("date"),
                    "journal_id": e.get("journal_id"),
                    "label": e.get("label"),
                    "invoice_number": e.get("invoice_number"),
                    "piece_number": e.get("piece_number"),
                    "due_date": e.get("due_date"),
                    # categories = lignes comptables avec comptes PCG (vide si non classé)
                    "categories": e.get("categories", []),
                    "classified": len(e.get("categories", [])) > 0,
                }
                for e in entries
                # Filtrer par compte PCG si demandé (côté agent)
                if not params.account_number or any(
                    str(params.account_number) in str(cat.get("account_plan_item", {}).get("number", ""))
                    for cat in e.get("categories", [])
                )
            ]
        }
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_create_ledger_entry",
    annotations={
        "title": "Créer une écriture comptable",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    }
)
async def pennylane_create_ledger_entry(params: CreateLedgerEntryInput) -> str:
    """
    Crée une écriture comptable manuelle dans Pennylane (OD, régularisation, etc.).

    Permet de passer des opérations diverses, des régularisations de fin
    d'exercice, ou toute écriture ne résultant pas d'une facture.

    Args:
        params (CreateLedgerEntryInput):
            - journal_code (str): Code journal ('ACH', 'VTE', 'BQ', 'OD')
            - date (str): Date de l'écriture (YYYY-MM-DD)
            - label (str): Libellé de l'écriture
            - account_debit (str): Compte à débiter (ex: '6011')
            - account_credit (str): Compte à créditer (ex: '401')
            - amount (float): Montant en euros
            - reference (str, optionnel): Numéro de pièce

    Returns:
        str: Confirmation avec l'ID de l'écriture créée.

    Exemples d'utilisation:
        - "Passe une OD pour régulariser le compte de TVA"
        - "Crée une écriture de dotation aux amortissements"
        - "Enregistre une provision pour créance douteuse"
    """
    try:
        # ── Étape 1 : trouver le journal_id depuis journal_code (ex: "OD", "BQ") ──
        journals_data = await _api("journals", params={"per_page": 100})
        journals = journals_data.get("items", [])
        journal = next(
            (j for j in journals if
             j.get("code", "").upper() == params.journal_code.upper() or
             j.get("name", "").upper() == params.journal_code.upper()),
            None
        )
        if not journal:
            available = [f"{j.get('code','?')} ({j.get('name','?')})" for j in journals]
            return json.dumps({"error": f"Journal '{params.journal_code}' introuvable. Disponibles: {available}"})
        journal_id = journal["id"]

        # ── Étape 2 : trouver les ledger_account_id depuis les numéros PCG ──
        async def find_account_id(number: str) -> int:
            filter_str = json.dumps([{"field": "number", "operator": "eq", "value": number}])
            data = await _api("ledger_accounts", params={"limit": 20, "filter": filter_str})
            items = data.get("items", [])
            if not items:
                # Chercher par start_with si exact introuvable
                filter_str2 = json.dumps([{"field": "number", "operator": "start_with", "value": number}])
                data2 = await _api("ledger_accounts", params={"limit": 20, "filter": filter_str2})
                items = data2.get("items", [])
            if not items:
                raise ValueError(f"Compte PCG '{number}' introuvable dans Pennylane")
            return items[0]["id"], items[0].get("number"), items[0].get("label")

        debit_id, debit_num, debit_lbl = await find_account_id(params.account_debit)
        credit_id, credit_num, credit_lbl = await find_account_id(params.account_credit)

        # ── Étape 3 : construire le body v2 correct ──
        body = {
            "date": params.date,
            "label": params.label,
            "journal_id": journal_id,
            "ledger_entry_lines": [
                {
                    "debit": str(params.amount),
                    "credit": "0",
                    "ledger_account_id": debit_id,
                    "label": params.label,
                },
                {
                    "debit": "0",
                    "credit": str(params.amount),
                    "ledger_account_id": credit_id,
                    "label": params.label,
                }
            ]
        }
        if params.reference:
            body["piece_number"] = params.reference

        data = await _api("ledger_entries", method="POST", body=body)

        return json.dumps({
            "success": True,
            "message": (
                f"✅ Écriture OD créée dans Pennylane\n"
                f"  Débit  : {debit_num} {debit_lbl} — {params.amount}€\n"
                f"  Crédit : {credit_num} {credit_lbl} — {params.amount}€\n"
                f"  Libellé: {params.label}"
            ),
            "id": data.get("id"),
            "piece_number": data.get("piece_number"),
            "journal_id": journal_id,
            "journal_code": params.journal_code,
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_balance_agee",
    annotations={
        "title": "Balance âgée clients ou fournisseurs",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_balance_agee(params: BalanceAgeeInput) -> str:
    """
    Calcule la balance âgée clients ou fournisseurs depuis les factures Pennylane.

    L'endpoint aged_balance n'existe pas en v2 → on construit la balance
    à partir de TOUTES les factures (filtrage côté Python), en calculant
    l'ancienneté par rapport à la date d'échéance.

    Args:
        params (BalanceAgeeInput):
            - type (str): 'customer' (clients) ou 'supplier' (fournisseurs)
            - at_date (str, optionnel): Date de référence (YYYY-MM-DD, défaut: aujourd'hui)

    Returns:
        str: Balance âgée avec ventilation par tranche (non échu, 0-30j, 31-60j, 61-90j, >90j).

    Exemples d'utilisation:
        - "Quels clients ont des factures en retard ?"
        - "Montre-moi la balance âgée fournisseurs"
        - "Quelles sont les créances à plus de 90 jours ?"
    """
    try:
        ref_date_str = params.at_date or datetime.today().strftime("%Y-%m-%d")
        ref_date = datetime.strptime(ref_date_str, "%Y-%m-%d")

        endpoint = "customer_invoices" if params.type == "customer" else "supplier_invoices"

        # Récupérer TOUTES les factures avec pagination curseur (v2 ignore le param "page")
        all_invoices = []
        seen_ids = set()
        cursor = None
        page_count = 0
        while True:
            query_params = {"per_page": 100}
            if cursor:
                query_params["cursor"] = cursor
            data = await _api(endpoint, params=query_params)
            items = data.get("items", [])
            for item in items:
                iid = item.get("id")
                if iid not in seen_ids:
                    seen_ids.add(iid)
                    all_invoices.append(item)
            page_count += 1
            if not data.get("has_more", False) or page_count >= 10:
                break
            cursor = data.get("next_cursor")
            if not cursor:
                break

        # Debug : clés disponibles sur la première facture
        debug_sample = {}
        if all_invoices:
            first = all_invoices[0]
            debug_sample = {k: first.get(k) for k in [
                "id", "invoice_number", "date", "deadline", "status",
                "payment_status", "amount", "amount_ht", "amount_with_tax",
                "remaining_amount", "remaining_amount_with_tax", "remaining_amount_ht",
                "balance", "unpaid_amount", "paid_amount"
            ] if k in first}

        # Calculer les tranches d'ancienneté
        tranches = {"non_echu": [], "0_30j": [], "31_60j": [], "61_90j": [], "plus_90j": []}
        tiers_summary = {}

        for inv in all_invoices:
            # Filtrer : exclure les factures soldées (paiement complet)
            status = inv.get("payment_status") or inv.get("status") or ""
            if status in ("fully_paid", "paid"):
                continue

            # Chercher le montant restant sous différents noms de champs
            remaining = (
                float(inv.get("remaining_amount_with_tax") or 0) or
                float(inv.get("remaining_amount") or 0) or
                float(inv.get("unpaid_amount") or 0) or
                float(inv.get("balance") or 0)
            )
            # Si aucun champ "remaining", utiliser le montant total si non payé
            if remaining == 0 and status not in ("fully_paid", "paid"):
                remaining = float(inv.get("amount_with_tax") or inv.get("amount") or 0)
            if remaining <= 0:
                continue

            deadline_str = inv.get("deadline") or inv.get("due_date") or inv.get("date")
            if not deadline_str:
                continue
            try:
                deadline = datetime.strptime(deadline_str[:10], "%Y-%m-%d")
            except Exception:
                continue

            days_late = (ref_date - deadline).days
            tiers_obj = inv.get("supplier") or inv.get("customer") or {}
            tiers_name = (
                tiers_obj.get("name") or
                tiers_obj.get("company_name") or
                tiers_obj.get("supplier_name") or
                tiers_obj.get("label") or
                inv.get("label") or
                "Inconnu"
            )
            inv_summary = {
                "id": inv.get("id"),
                "invoice_number": inv.get("invoice_number"),
                "date": inv.get("date"),
                "deadline": deadline_str[:10],
                "days_late": days_late,
                "remaining_ttc": remaining,
                "tiers": tiers_name,
                "status": status,
            }

            if days_late <= 0:
                tranches["non_echu"].append(inv_summary)
            elif days_late <= 30:
                tranches["0_30j"].append(inv_summary)
            elif days_late <= 60:
                tranches["31_60j"].append(inv_summary)
            elif days_late <= 90:
                tranches["61_90j"].append(inv_summary)
            else:
                tranches["plus_90j"].append(inv_summary)

            if tiers_name not in tiers_summary:
                tiers_summary[tiers_name] = {"non_echu": 0, "0_30j": 0, "31_60j": 0, "61_90j": 0, "plus_90j": 0, "total": 0}
            key = "non_echu" if days_late <= 0 else ("0_30j" if days_late <= 30 else ("31_60j" if days_late <= 60 else ("61_90j" if days_late <= 90 else "plus_90j")))
            tiers_summary[tiers_name][key] += remaining
            tiers_summary[tiers_name]["total"] += remaining

        totaux = {k: round(sum(i["remaining_ttc"] for i in v), 2) for k, v in tranches.items()}
        totaux["grand_total"] = round(sum(totaux.values()), 2)

        return json.dumps({
            "type": params.type,
            "at_date": ref_date_str,
            "total_factures_analysees": len(all_invoices),
            "totaux": totaux,
            "par_tiers": tiers_summary,
            "detail": {k: v for k, v in tranches.items() if v},
            "debug_first_invoice_fields": debug_sample,
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_export_fec",
    annotations={
        "title": "Exporter le FEC (Fichier des Écritures Comptables)",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_export_fec(params: FecInput) -> str:
    """
    Exporte le Fichier des Écritures Comptables (FEC) pour une période.

    Le FEC est le fichier légal requis lors d'un contrôle fiscal.
    Format normalisé selon l'article A.47 A-1 du Livre des Procédures Fiscales.

    Args:
        params (FecInput):
            - date_from (str): Date de début (YYYY-MM-DD), ex: '2024-01-01'
            - date_to (str): Date de fin (YYYY-MM-DD), ex: '2024-12-31'

    Returns:
        str: Confirmation avec lien de téléchargement ou données FEC.

    Exemples d'utilisation:
        - "Exporte le FEC 2024 pour le contrôle fiscal"
        - "Génère le FEC du premier trimestre 2025"
    """
    try:
        query_params = {
            "date_from": params.date_from,
            "date_to": params.date_to,
        }
        data = await _api("fec_export", params=query_params)

        return json.dumps({
            "success": True,
            "message": f"FEC généré pour la période {params.date_from} → {params.date_to}",
            "result": data
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_send_payment_reminder",
    annotations={
        "title": "Envoyer une relance de paiement",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    }
)
async def pennylane_send_payment_reminder(params: ReminderInput) -> str:
    """
    Envoie une relance de paiement pour une facture client en retard.

    Déclenche l'envoi d'un email de relance depuis Pennylane
    vers le client concerné.

    Args:
        params (ReminderInput):
            - invoice_id (str): ID de la facture à relancer
            - message (str, optionnel): Message personnalisé à inclure

    Returns:
        str: Confirmation d'envoi de la relance.

    Exemples d'utilisation:
        - "Relance le client pour la facture FA-2025-042"
        - "Envoie une relance amiable pour toutes les factures en retard"
    """
    try:
        body = {}
        if params.message:
            body["message"] = params.message

        data = await _api(
            f"customer_invoices/{params.invoice_id}/remind",
            method="POST",
            body=body if body else None
        )

        return json.dumps({
            "success": True,
            "message": f"Relance envoyée avec succès pour la facture {params.invoice_id}.",
            "result": data
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_vat_summary",
    annotations={
        "title": "Récapitulatif TVA pour déclaration CA3",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_vat_summary(params: VatInput) -> str:
    """
    Calcule le récapitulatif de TVA depuis les écritures comptables.

    Reconstruit la TVA collectée (44571x) et déductible (44566x)
    depuis le grand livre, car l'endpoint vat_summary n'existe pas en v2.

    Args:
        params (VatInput):
            - date_from (str): Début de la période TVA (YYYY-MM-DD)
            - date_to (str): Fin de la période TVA (YYYY-MM-DD)

    Returns:
        str: Résumé TVA avec TVA collectée, déductible et solde net.

    Exemples d'utilisation:
        - "Prépare la TVA du mois de mars 2025"
        - "Quel est le montant de TVA à déclarer ce trimestre ?"
        - "Calcule la TVA nette à payer pour janvier"
    """
    try:
        # Approche v2 : reconstruire la TVA depuis les FACTURES (pas le grand livre)
        # TVA collectée = somme TVA sur customer_invoices de la période
        # TVA déductible = somme TVA sur supplier_invoices de la période

        async def fetch_invoices_period(endpoint: str) -> list:
            """Récupère toutes les factures avec curseur et filtre par date côté Python."""
            all_items = []
            seen_ids = set()
            cursor = None
            page_count = 0
            while True:
                qp = {"per_page": 100}
                if cursor:
                    qp["cursor"] = cursor
                data = await _api(endpoint, params=qp)
                items = data.get("items", [])
                for item in items:
                    iid = item.get("id")
                    if iid in seen_ids:
                        continue
                    seen_ids.add(iid)
                    item_date = item.get("date") or ""
                    if item_date and params.date_from <= item_date <= params.date_to:
                        all_items.append(item)
                page_count += 1
                if not data.get("has_more", False) or page_count >= 20:
                    break
                cursor = data.get("next_cursor")
                if not cursor:
                    break
            return all_items

        cust_invoices = await fetch_invoices_period("customer_invoices")
        supp_invoices = await fetch_invoices_period("supplier_invoices")

        def extract_tva(invoices: list) -> tuple:
            """Extrait le montant de TVA depuis une liste de factures."""
            total = 0.0
            detail = []
            for inv in invoices:
                # Champ "tax" confirmé dans le debug des supplier_invoices v2
                tva = float(inv.get("tax") or inv.get("tax_amount") or inv.get("vat_amount") or 0)
                if tva == 0:
                    # Fallback : calculer depuis currency_amount (TTC) - currency_amount_before_tax (HT)
                    ttc = float(inv.get("currency_amount") or inv.get("amount_with_tax") or 0)
                    ht = float(inv.get("currency_amount_before_tax") or inv.get("amount") or 0)
                    tva = round(ttc - ht, 2) if ttc > 0 else 0
                if tva != 0:
                    tiers_obj = inv.get("supplier") or inv.get("customer") or {}
                    tiers_name = (
                        tiers_obj.get("name") or tiers_obj.get("company_name") or
                        inv.get("label") or "?"
                    )
                    total += tva
                    detail.append({
                        "invoice_number": inv.get("invoice_number"),
                        "date": inv.get("date"),
                        "tiers": tiers_name,
                        "tva": round(tva, 2),
                    })
            return round(total, 2), detail

        tva_collectee, detail_collectee = extract_tva(cust_invoices)
        tva_deductible, detail_deductible = extract_tva(supp_invoices)
        solde_net = round(tva_collectee - tva_deductible, 2)

        # Debug : champs disponibles sur un sample de facture
        debug_cust_keys = list(cust_invoices[0].keys()) if cust_invoices else []
        debug_supp_keys = list(supp_invoices[0].keys()) if supp_invoices else []

        return json.dumps({
            "period": f"{params.date_from} → {params.date_to}",
            "factures_client_analysees": len(cust_invoices),
            "factures_fournisseur_analysees": len(supp_invoices),
            "tva_collectee_44571": {
                "total": tva_collectee,
                "detail": detail_collectee[:10],  # max 10 pour lisibilité
            },
            "tva_deductible_44566": {
                "total": tva_deductible,
                "detail": detail_deductible[:10],
            },
            "solde_net": solde_net,
            "interpretation": "À PAYER" if solde_net > 0 else "CRÉDIT DE TVA",
            "note": "Calculé depuis les factures (TTC - HT) — vérifier avec module TVA Pennylane",
            "debug_cust_invoice_keys": debug_cust_keys,
            "debug_supp_invoice_keys": debug_supp_keys,
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="pennylane_get_customers",
    annotations={
        "title": "Récupérer la liste des clients",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    }
)
async def pennylane_get_customers(params: CustomerInput) -> str:
    """
    Récupère la liste des clients enregistrés dans Pennylane.

    Permet de trouver les IDs clients nécessaires pour créer des factures
    ou envoyer des relances.

    Args:
        params (CustomerInput):
            - page (int): Numéro de page
            - per_page (int): Résultats par page
            - search (str, optionnel): Rechercher par nom

    Returns:
        str: JSON avec la liste des clients, leurs IDs et coordonnées.

    Exemples d'utilisation:
        - "Trouve l'ID client de la société XYZ"
        - "Liste tous les clients actifs"
        - "Cherche le client Dupont"
    """
    try:
        query_params = {"page": params.page, "per_page": params.per_page}
        if params.search:
            query_params["filter[name]"] = params.search

        # Tenter d'abord "customers", sinon "customer_invoices" pour extraire les tiers
        customers = []
        total = 0
        try:
            data = await _api("customers", params=query_params)
            customers = data.get("items", data.get("customers", data.get("data", [])))
            total = data.get("total", len(customers))
        except Exception:
            # Fallback : extraire les clients uniques depuis les factures clients
            inv_data = await _api("customer_invoices", params={"page": 1, "per_page": 100})
            invoices = inv_data.get("items", [])
            seen = {}
            for inv in invoices:
                c = inv.get("customer") or {}
                cid = c.get("id")
                if cid and cid not in seen:
                    seen[cid] = c
            customers = list(seen.values())
            total = len(customers)

        result = {
            "total": total,
            "count": len(customers),
            "customers": [
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "email": c.get("email"),
                    "siret": c.get("siret"),
                    "address": c.get("address"),
                }
                for c in customers
            ]
        }
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _err(e)


# ─── Lancement ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not PENNYLANE_TOKEN:
        print("⚠️  ATTENTION : Variable PENNYLANE_TOKEN non définie !")
        print("   Lancez : export PENNYLANE_TOKEN=votre_token_ici")
        print()
    print("🚀 ComptaMind MCP Server démarré — En attente de connexion Claude...")
    mcp.run()
