'use strict';

module.exports = function(Client) {

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

	// Disable some relational functions 
	Client.disableRemoteMethodByName('prototype.__create__apis');			// POST		/clients/:id/apis	
	Client.disableRemoteMethodByName('prototype.__delete__apis');			// DELETE	/clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__findById__apis');			// GET		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__updateById__apis');		// PUT		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__destroyById__apis');		// DELETE	/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__count__apis');			// GET 		/clients/:id/apis/count
	Client.disableRemoteMethodByName('prototype.__link__apis');
	Client.disableRemoteMethodByName('prototype.__unlink__apis');	
};
