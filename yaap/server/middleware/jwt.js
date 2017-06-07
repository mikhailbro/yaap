module.exports = function() {
  return function validateAt(req, res, next) {

    var jwt = require('jsonwebtoken');
    var jwkToPem = require('jwk-to-pem');
    var authorization = req.get('authorization');
    req.user = {};

    if (authorization) {
    	try {
        var at = authorization.split(" ")[1] // Use only last part of 'Bearer xxx'
        var at_decoded = jwt.decode(at, {complete: true}); // Without signature validation, only needed for kid extraction
        var kid = at_decoded.header.kid;

        // Read cert from memory
        var Cert = req.app.models.Cert;
        Cert.find({where: {kid:kid}}, function(err, certs) {
          if (err) {next(err)} else {
            // Check if a cert with kid from AT exists
            if (certs.length == 0) {
              // No cert exists, fetch it from AS
              var oauthConfig = req.app.get("oauth"); // Read url from config.js
              getJwkFromAs(oauthConfig, function(err, response){
                if (err) {next(err)} else {
                  console.log(jwk);
                  var jwk = response.body.keys.find(function(currentValue, index, arr){
                    return kid == currentValue.kid; // Read jwk from array which matches to our kid
                  });

                  var pem = jwkToPem(jwk); // Convert jwk to pem
                  var certInstance = {"kid": kid, "cert": pem};
                  Cert.create(certInstance, function(err, cert){
                    if (err) {next(err)} else {
                      analyzeAt(req, at, pem, function(err, response){
                        if (err) {
                          res.status(400).send({error: 'authorization failed', detail: 'invalid access token'});
                          next(err);
                        } else {
                          next();
                        }
                      });
                    }
                  });
                }
              });

            } else {
              // Cert exists, use it for AT validation
              var cert = certs.find(function(currentValue, index, arr){
                return kid == currentValue.kid;
              });
              var pem = cert.cert;
              analyzeAt(req, at, pem, function(err, response){
                if (err) {
                  res.status(400).send({error: 'authorization failed', detail: 'invalid access token'});
                  next(err)
                } else {
                  next();
                }
              });

            }
          }

        });

      } catch(err) {
        console.log("ERROR");
        console.log(err);
        res.status(400).send({error: 'authorization failed', detail: 'invalid access token'});
        return;
      }
    } else {
      // No token, public access
      req.user.isAuthenticated = false;
      req.user.isAdmin = false;
      req.user.apiOwnerTenants = [];
      req.user.apiConsumerTenants = [];
      next();
    }

  }

  function getJwkFromAs(oauthConfig, callback) {
    var request = require('request'); // Request module for retrieving the keys of Okta AS
    var options  = {
      url: oauthConfig.jwksUrl,
      json: true,
      headers: {}
    };
    // Call AS
    request.get(options, function(error, response, body) {
      if (error || response.statusCode != 200) {
        console.log("ERROR");
        console.log(error);
        if (response) {
          console.log("STATUS CODE");
          console.log(response.statusCode);
        }
        callback(error, null);
      } else {
        callback(null, response);
      }
    });
  }

  function analyzeAt(req, at, pem, callback) {
    var jwt = require('jsonwebtoken');
    jwt.verify(at, pem, function(err, at_decoded) {
      if (err) {callback(err, null)} else {
        // Set sub
        req.user.sub = at_decoded.sub;

        // Check if user is admin
        if (at_decoded.yaapAdmin) {
          req.user.isAdmin = true;
        } else {
          req.user.isAdmin = false;
        }

        var Tenant = req.app.models.Tenant;

        // 	Find all tenants with the api-owner roles from the token
        console.log(at_decoded)
        Tenant.find({where: {apiOwnerRole: {inq: at_decoded.yaapRoles}}}, function(err, tenants) {
          if (err) {
            console.log("ERROR");
            console.log(err);
            callback(err, null);
          } else {
            req.user.apiOwnerTenants = tenants.map(function(tenants) {return tenants.id.toString();});  // Get all tenantIds...

            // 	Find all tenants with the api-owner roles from the token
            Tenant.find({where: {apiConsumerRole: {inq: at_decoded.yaapRoles}}}, function(err, tenants) {
              if (err) {
                console.log("ERROR");
                console.log(err);
                callback(err, null);
              } else {
                req.user.apiConsumerTenants = tenants.map(function(tenants) {return tenants.id.toString();});  // Get all tenantIds...
                callback(null, null);
              }
            });
          }
        });
      };
    });

  }

};
