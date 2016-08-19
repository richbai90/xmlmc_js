/*
 This example is a simple ECMAScript 5 version of an Ajax request to the local server.
 It exists only to show the basic functionality for interfacing with the server and does not
 make use of any SDK and uses only vanilla javascript. Consequently it will not work for cross-origin requests.
 Also, this isn't very secure and we definitely do not recommend that you use this library in production. It's
 only for demonstration. Javascript shouldn't handle passwords, especially clear text ones.
 */

(function () {
    var endpointMap = {
        system: 'sw/xmlmc',
        session: 'sw/xmlmc',
        mylibrary: 'sw/xmlmc',
        data: 'sw/xmlmc',
        helpdesk: 'sw/xmlmc',
        reporting: 'sw/xmlmc',
        survey: 'sw/xmlmc',
        knowledgebase: 'sw/xmlmc',
        selfservice: 'sw/xmlmc',
        admin: 'sw/xmlmc',
        mail: 'sw/xmlmc/mail',
        addressbook: 'sw/xmlmc/mail',
        calendar: 'sw/xmlmc/calendar'
    };

    function Xmlmc(server) {
        this.sessionCookie = '';
        this.server = server;
    }


    function Request(method, service) {
        this.method = method;
        this.service = service;
        this.params = {};
    }

    Request.prototype.setParam = function (param, value) {
        this.params[param] = value;
    };

    Request.prototype.setParams = function (params) {
        if (typeof params != 'object') {
            throw('Expected object for method setParams got instead ' + typeof params);
        }
        this.params = Object.assign(this.params, params);
    };

    Request.prototype.toXml = function () {
        var xml = '<methodCall service="' + this.service + '" method="' + this.method + '">';
        xml += '\n\t<params>';
        xml += '\n' + this.processParams();
        xml += '\n\t</params>';
        xml += '\n</methodCall>';

        return xml;
    };

    Request.prototype.processParams = function (params) {
        params = params || this.params;
        params.recursion = params.recursion + 1 || 0;
        var xml = '';

        for (var p in params) {
            //recursion is to track recursive calls and shouldn't be processed as xml
            if (p == 'recursion') {
                continue;
            }

            if (params.hasOwnProperty(p)) {
                //base64 encode sensitive data
                if ((p.toLowerCase() == 'password') || (p.toLowerCase() == 'secretkey')) {
                    params[p] = btoa(this.params[p]);
                }

                xml += '\t<' + p + '>';
                if ((typeof params[p]).toLowerCase() == 'string') {
                    xml += params[p];
                } else {
                    //assume object, and recur
                    if (params.recursion < 10) {
                        //So as not to get caught in a recursive loop
                        xml += '\n' + this.processParams(params[p]);
                    } else {
                        //This isn't supposed to happen
                        throw('Processing parameters caught in recursive loop');
                    }

                }
                xml += '</' + p + '>\n'

            }
        }

        return xml;
    };

    Xmlmc.prototype.newRequest = function (method, service) {
        return new Request(method, service);
    };

    //todo: implement promise pattern
    Xmlmc.prototype.submitRequest = function (request, callback) {
        callback = callback || function (r) {
            };
        var self = this;
        var endpoint = this.endpoint = 'http://' + this.server + '/' + endpointMap[request.service];
        this.lastRequest = request.service + '::' + request.method;
        var xml = request.toXml();
        var xhttp;
        if (window.XMLHttpRequest) {
            xhttp = new XMLHttpRequest();
        } else {
            // IE 5 and 6 makes us sad. Please don't use it
            xhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        //handle request
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4) {
                var response = self.handleResponse(xhttp);
                callback(response);
            }
        };

        xhttp.open('POST', endpoint, true);
        xhttp.setRequestHeader('Content-type', 'text/xmlmc');
        xhttp.withCredentials = true;
        xhttp.send(xml);
    };

    Xmlmc.prototype.handleResponse = function (xhttp) {
        var response = {};
        response.request = this.lastRequest;
        response.httpStatus = xhttp.status;
        //could add more status handling
        switch (response.httpStatus) {
            case 200:
                response.httpStatusText = 'Okay';
                break;
            case 404:
                response.httpStatusText = 'endpoint ' + this.endpoint + ' not found on server';
                return response;

            default:
                response.httpStatusText = 'HTTP Request Failed For some Reason, refer to response.httpStatus for details';
                return response;
        }

        response.responseText = xhttp.responseText;

        //update the session cookie
        //this.sessionCookie = xhttp.getResponseHeader('set-cookie');
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xhttp.responseText, 'text/xml');

        response.swStatus = xmlDoc.getElementsByTagName('methodCallResult')[0].getAttribute('status');
        if (response.swStatus == 'fail') {
            console.log('failed');
            response.error = xmlDoc.getElementsByTagName('error')[0].textContent;
            return response;
        }

        response.params = {};
        var params = xmlDoc.getElementsByTagName('params')[0];
        if (params) {
            console.log(params.childNodes);
            params = params.childNodes;

            for (var i = 0; i < params.length; i++) {
                var param = params[i];
                if (param.tagName) {
                    response.params[param.tagName] = param.textContent;
                }

            }
        }

        var data = xmlDoc.getElementsByTagName('data')[0];
        if (data) {
            response.data = [];
            var records = xmlDoc.getElementsByTagName('record'),
                rows = xmlDoc.getElementsByTagName('row'),
                columns,
                column;

            if (records.length > 0) {
                //this is a record set not a row set
                for (i = 0; i < records.length; i++) {
                    response.data.push({});
                    columns = records[i].childNodes;
                    for (var c = 0; c < columns.length; c++) {
                        column = columns[c];
                        if (column.tagName) {
                            response.data[i][column.tagName] = column.textContent;
                        }
                    }
                }
            } else if (rows.length > 0) {
                for (i = 0; i < rows.length; i++) {
                    columns = rows[i].childNodes;
                    response.data.push({});
                    for (c = 0; c < columns.length; c++) {
                        column = columns[c];
                        if (column.tagName) {
                            response.data[i][column.tagName] = column.textContent;
                        }

                    }
                }
            }
        }

        return response;

    };

    //add Xmlmc to the global scope.
    window.Xmlmc = Xmlmc;
})(window);


