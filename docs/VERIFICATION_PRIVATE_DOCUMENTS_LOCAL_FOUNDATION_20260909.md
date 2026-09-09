# Verification Private Documents — Local Foundation

Date: 2026-09-09

Status: local implementation only.

## Purpose

Add the protected document flow already defined by the frozen Identity &
Governance architecture without changing the approved verification lifecycle.

## Runtime contract

- private Storage bucket: `verification-private-documents`
- requester must own the verification request
- requester uploads only while the request is open
- reviewer access requires an active verification authority role
- no permanent public URL
- downloads use short-lived signed URLs
- upload uses a signed upload token
- metadata stays in `entity_verification_documents`
- file bytes stay in Storage
- SHA-256 is calculated before upload and verified by the server before metadata
  is accepted
- Storage object is removed if final verification or metadata persistence fails

## Initial secure file policy

- PDF
- JPEG
- PNG
- maximum 10 MB per document

Database, STAGING, Storage configuration and Production are not changed by this
local source macroblock.

A separate explicit STAGING authorization is required before the private bucket
is created or any real document is uploaded.