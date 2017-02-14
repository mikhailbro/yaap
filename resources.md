# API
- ~~id~~
- ~~name~~
- audience (public, array of tenants) => needed for authorization / visibility of APIs, etc.
- swagger (version, hostname, basepath, contac, etc.)
- state (enabled, disabled, deprecated)
- approval-workflow for client registrations (yes, no, if yes => approval endpoint)
- approval-endpoint
- authorization-methods (OAuth, HTTP Basic Auth, Client Certs, etc.)

# TENANT
- id
- name
- role names for 4 roles (admin, tenant-admin, provider, consumer)

# CLIENT (Application)
- id
- name
- contact
