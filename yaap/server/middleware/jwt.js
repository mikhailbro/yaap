module.exports = function() {
  return function validateAt(req, res, next) {

    var jwt = require('jsonwebtoken');
    
    var authorization = req.get('authorization');
    if (authorization) {
    	try {
    		var at = authorization.split(" ")[1] // Use only last part of 'Bearer xxx'
			var at_decoded = jwt.verify(at, 'secret');
			
			// Set sub
			req.sub = at_decoded.sub;
			
			// Check if user is admin
			if (at_decoded.roles.admin) {
				req.isAdmin = true;
			} else {
				req.isAdmin = false;
			}

			var Tenant = req.app.models.tenant;
			// 	Find all tenants with the api-owner roles from the token
			Tenant.find({where: {apiOwnerRole: {inq: at_decoded.roles.apiOwner}}}, function(err, tenants) {
				if (err) {
					console.log("ERROR");
					console.log(err);
					next(err);
				}
				req.apiOwnerTenants = tenants.map(function(tenants) {return tenants.id.toString();});  // Get all tenantIds...

				// 	Find all tenants with the api-owner roles from the token
				Tenant.find({where: {apiConsumerRole: {inq: at_decoded.roles.apiConsumer}}}, function(err, tenants) {
					if (err) {
						console.log("ERROR");
						console.log(err);
						next(err);
					}
				
					req.apiConsumerTenants = tenants.map(function(tenants) {return tenants.id.toString();});  // Get all tenantIds...

					// Call next middleware...
					next();
				});

			});

		} catch(err) {
			console.log("ERROR");
			console.log(err);
			res.status(400).send({error: 'authorization failed', detail: 'invalid access token'});
			return;
		} 
    } else {
    	// No token, public access
    	req.apiOwnerTenants = [];
    	req.apiConsumerTenants = [];
    	next();
    }

   
  }
};