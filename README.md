# yaap
Yet another API Portal
Design and (eventually) implementation

# principles
* a tenant is a kind of organization, it can be an API owner group or a API consumer group
* each API owner must belong to one or more tenants and each API must belong to exactly one tenant
* an API consumer can belong to zero or more tenants but can also be "individual", i.e. not belonging to a tenant. Non-tenant consumers can only see and register themselves to public APIs

# todo
* Resource model
* API Design
* Role model and permissions
* Webhooks
* 




MONGODB in C9:
-   installation: sudo apt-get install -y mongodb-org
-   start: mongod --bind_ip=$IP --nojournal. 
    Now you can open the mongo shell in a new Terminal, running following command:
    mongo
