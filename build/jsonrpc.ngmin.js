/**!
 * angular-jsonrpc v0.1.4 [build 2016-08-10]
 * @copyright 2016 Arunjit Singh <opensrc@ajsd.in>. All Rights Reserved.
 * @license MIT; see LICENCE.
 * [https://github.com/ajsd/angular-jsonrpc.git]
 */
'use strict';
/**
 * Provides and configures the jsonrpc service.
 */
angular.module('jsonrpc', ['uuid']).provider('jsonrpc', function () {
  var defaults = this.defaults = {};
  // defaults
  defaults.basePath = '/rpc';
  // provider.$get
  this.$get = [
    '$http',
    '$q',
    'uuid4',
    function ($http, $q, uuid4) {
      /**
     * Makes a JSON-RPC request to `method` with `data`.
     *
     * @param {{path:string=, method:string, data:*)}} options Call options.
     * @param {angular.$http.Config} config HTTP config.
     * @return {angular.$http.HttpPromise}
     */
      function jsonrpc(options, config) {
        var id = uuid4.generate();
        var payload = {
            jsonrpc: '2.0',
            method: options.method,
            id: id
          };
        if (angular.isDefined(options.data)) {
          payload.params = options.data;
        }
        // Transformers to extract the response data.
        // TODO(arunjit): Use response interceptors when the API is stable.
        // REMOVED (jaap): lijkt onnodig
        /*
      var transforms = [];
      angular.forEach($http.defaults.transformResponse, function(t) {
        transforms.push(t);
      });
      transforms.push(function(data) {
        return data.id === id ? data.result || data.error : null;
      });

      config = config || {};
      var configTransforms = config.transformResponse;
      if (angular.isArray(configTransforms)) {
        [].push.apply(transforms, configTransforms);
      } else if (angular.isFunction(configTransforms)) {
        transforms.push(configTransforms);
      }
      config.transformResponse = transforms;
      */
        // TODO(arunjit): Use $q to resolve the result.
        // ADD(jaap): return response data
        return $http.post(options.path || defaults.basePath, payload, config).then(function (response) {
          // Only `null` is not an error. '', 0, false are valid errors.
          if (response.data.error !== undefined && response.data.error !== null) {
            return $q.reject(response.data.error);
          }
          // According to JSON-RPC specification, these fields are required.
          // Something wrong happend with server, if it does not return
          // data in valid format.
          if (response.data.jsonrpc === undefined || response.data.id === undefined || response.data.result === undefined) {
            return $q.reject({
              code: -32700,
              message: 'Parse error'
            });
          }
          return response.data.result;
        });
      }
      /**
     * Shorthand for making a request.
     *
     * @param {string} path The call path.
     * @param {string} method The method to call.
     * @param {?*} data The data for the call.
     * @param {angular.$http.Config} config HTTP config.
     * @return {angular.$http.HttpPromise}
     */
      jsonrpc.request = function (path, method, data, config) {
        if (arguments.length < 4) {
          config = data;
          data = method;
          method = path;
          path = null;
        }
        return jsonrpc({
          path: path,
          method: method,
          data: data
        }, config);
      };
      /**
     * Helper to create services.
     *
     * Usage:
     *     module.service('locationService', function(jsonrpc) {
     *       var service = jsonrpc.newService('locationsvc');
     *       this.get = service.createMethod('Get');
     *     });
     *     ...
     *     module.controller(..., function(locationService) {
     *       locationService.get({max: 10}).success(function(d) {...});
     *       // GET /rpc
     *       // {"method": "locationsvc.Get", "params": {"max": 10}, ...}
     *     });
     *
     * @param {string} name The name of the service. This is the prefix used for
     *     all methods created through this service.
     * @param {string} path Optional path for this service.
     * @constructor
     */
      function Service(name, path) {
        this.serviceName = name;
        this.path = path;
      }
      /**
     * Creates a new service method.
     *
     * @param {string} name Method name.
     * @param {angular.$http.Config=} config HTTP config.
     * @return {function(*):angular.$http.HttpPromise} An implementation for the
     *     service method.
     */
      Service.prototype.createMethod = function (name, config) {
        var path = this.path;
        var method = name;
        if (this.serviceName) {
          method = this.serviceName + '.' + method;
        }
        return function (data) {
          return jsonrpc.request(path, method, data, config);
        };
      };
      /** Creates a new Service with the given `name` and optional `path`. */
      jsonrpc.newService = function (name, path) {
        return new Service(name, path);
      };
      // ADDED (jaap): set basepath after runtime
      jsonrpc.setBasePath = function (path) {
        defaults.basePath = path;
        return this;
      };
      // ADDED (jaap): get basepath after runtime
      jsonrpc.getBasePath = function () {
        return defaults.basePath;
      };
      return jsonrpc;
    }
  ];
  /** Set the base path for all JSON-RPC calls to |path|. */
  this.setBasePath = function (path) {
    defaults.basePath = path;
    return this;
  };
});