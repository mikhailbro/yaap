'use strict';

module.exports = function(Client) {
<<<<<<< HEAD
	var uuid = require('node-uuid');
	
=======

	var uuid = require('node-uuid');

	/**************************
	*	Disable REST functions
	***************************/
>>>>>>> aac3b6562b11e81f32cea911c5461b24c23f4b1d
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

<<<<<<< HEAD

	// GET /clients
	Client.beforeRemote('find', function(context, unused, next) {
		if (!context.args.filter || !context.args.filter.where) {
	    	// No 'where' filter in request, add where clause to check audience
	    	context.args.filter = {where: { audience: { inq: context.req.apiConsumerTenants}}};
	    } else {
	    	// 'where' clause in request, add AND clause to check audience
	    	context.args.filter.where = {and: [{audience: { inq: context.req.apiConsumerTenants}}, context.args.filter.where] };
	    }
	    next();
	});
	 
	// GET /clients/{id}
	//check response as no where clause can be set in beforeRemote()
	Client.afterRemote('findById', function(context, response, next) {
		if (!response) {
			next();
			return;
		}
		
		// Check if user has role apiConsumer for the audience of the Client
		if (checkAudience(response.audience, context.req.apiConsumerTenants)) {
			console.log("ok");
			next();
		} else {
			console.log("nok");
			var error = new Error();
			error.status = 404;
			error.message = 'Unknown "client" id "' + response.id + '".';
			error.code = 'MODEL_NOT_FOUND';
			next(error);
		}
	});
	 
	// POST /clients
	Client.beforeRemote('create', function(context, unused, next) {
		// Check that tenantId from body matches one tenant from apiConsumer Role from token
		if (isTenantInArray(context.req.body.tenantId, context.req.apiConsumerTenants)) {
			var newId = uuid.v4();
			context.req.body.id = newId;
			next();
		} else {
			var error = new Error();
			error.status = 400;
			error.message = 'Wrong tenantId in request body.';
			error.code = 'BAD_REQUEST';
			next(error);
		}
	});
	
	// DELETE /clients/{id}
	Client.beforeRemote('deleteById', function(context, unused, next){
		Client.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, client) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}

			if (client && isTenantInArray(client.tenantId, context.req.apiConsumerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "client" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
				next(error);
			}

		});
	});
	
	// PUT /clients/{id} and  POST /clients/{id}/replace
	/*Client.beforeRemote('replaceById', function(context, unused, next) {
		Client.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, client) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}
				
			if (isTenantInArray(api.tenantId, context.req.apiConsumerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "client" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
				next(error);
			}

		});
	});*/
	
	
	function isTenantInArray(tenantId, tenants) {
		// NOTE: array.indexOf() doesn't seem to work with mongodb generated ids....
		var isOk = false;
		for (var i = 0; i < tenants.length; i++) {
			if (tenants[i] == tenantId) {
				isOk = true;
				break;
			} 
		}
		return isOk;
	}
	
	function checkAudience(audience, apiConsumers) {
		// NOTE: array.indexOf() doesn't seem to work with mongodb generated ids....
		return apiConsumers.some(function (v) {
        	return audience.indexOf(v) >= 0;
    	});
	}
	
=======
	// Disable some relational functions for apis
	Client.disableRemoteMethodByName('prototype.__create__apis');			// POST		/clients/:id/apis	
	Client.disableRemoteMethodByName('prototype.__delete__apis');			// DELETE	/clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__findById__apis');			// GET		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__updateById__apis');		// PUT		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__destroyById__apis');		// DELETE	/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__count__apis');			// GET 		/clients/:id/apis/count
	Client.disableRemoteMethodByName('prototype.__link__apis');				// PUT 		/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__unlink__apis');			// DELETE 	/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__exists__apis');		// HEAD 	/clients/:id/apis/rel/:apiId

	/**************************
	*	Validation Checks
	***************************/
	// TODO

	/**************************
	*	Remote Hooks
	***************************/
	// TODO

	/**************************
	*	Helper Functions
	***************************/
	// TODO
>>>>>>> aac3b6562b11e81f32cea911c5461b24c23f4b1d
};
