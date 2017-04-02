'use strict';

module.exports = function(Client) {
	
	/**************************
	*	Disable REST functions
	***************************/
	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Client.disableRemoteMethodByName('exists'); 					// GET		/clients/:id/exists
	Client.disableRemoteMethodByName('findOne');					// GET		/clients/findOne
	Client.disableRemoteMethodByName('count');						// GET 		/clients/count
	Client.disableRemoteMethodByName('createChangeStream');			// POST		/clients/change-stream
	Client.disableRemoteMethodByName('patchOrCreate');				// PATCH	/clients
	Client.disableRemoteMethodByName('replaceOrCreate');			// PUT		/clients
	Client.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/clients/:id
	Client.disableRemoteMethodByName('updateAll');					// POST		/clients/update
	Client.disableRemoteMethodByName('upsertWithWhere');			// POST		/clients/upsertWithWhere


	/**************************
	*	Remote Hooks
	***************************/
	/* NEEDS TO BE CLARIFY: what is necessary here and what is not */

	// POST /clients
	Client.beforeRemote('create', function(context, unused, next) {

		context.req.body.updatedBy = context.req.sub;
		context.req.body.createdBy = context.req.sub;
		next();
		// NOTE: FURTHER AUTHORIZATION / VALIDATION TO BE IMPLEMENTED!!
	});

	// PUT /clients/{id} and  POST /clients/{id}/replace
	Client.beforeRemote('replaceById', function(context, unused, next) {

		// Read Client first to check authorization
		Client.findById(context.req.params.id, { fields: {tenantId: true, createdBy: true} }, function(err, client) {
			context.req.body.updatedBy = context.req.sub;
			context.req.body.createdBy = client.createdBy;
			next();
			// NOTE: FURTHER AUTHORIZATION / VALIDATION TO BE IMPLEMENTED!!
		});
	});
	
};
