#Security

## General Requirements
- API Security purely relies on OAuth 2.0
- User management within yaap:
  - must not be mandatory, external user management must be possible
  - must be possible in yaap for scenarios with no external user management
- Roles must be part of the Access Token

## Authorization / multi tenancy
- Role-based security 
- The following roles exist 
  - admin (global)
  - api-owner (per tenant)
  - api-consumer (per tenant)
  - tenant-admin (per tenant), maybe used in the future
- Each API belongs to a tenant and sets its visibiliy (i.e. for which tenants is the API visible, incl. public)
- API owners can manage all APIs visible for their tenant
- API consumers can see and register to all APIs visible for their tenant AND public apis
