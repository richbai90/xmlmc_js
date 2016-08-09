#Xmlmc-JS

A javascript wrapper for making XMLMC calls


##Usage

```javascript
// Create a new xmlmc instance
    var xmlmc = new Xmlmc('localhost');
    var login = xmlmc.newRequest('analystLogon','session');
    login.setParams({
        userId: 'admin',
        password: ''
    });

// Setup requests
    var logCall = xmlmc.newRequest('logNewCall','helpdesk');

    logCall.setParams({
        callClass: 'incident',
        customerId: 'AlanC',
        updateMessage: 'This is a test!'
    });

    var logoff = xmlmc.newRequest('analystLogoff', 'session');

// Submit requests in synchronous
    xmlmc.submitRequest(login, function(response) {
        xmlmc.submitRequest(logCall, function(response) {
            xmlmc.submitRequest(logoff, function(response) {
            })
        })

    });
```

##Classes

The javascript wrapper is made up of two classes, `Xmlmc` and `Request`. The `Xmlmc` class is responsible for providing an
instance of the `Request` class, and for sending those requests and handling responses.

`Xmlmc` has the following methods:

* `newRequest([string] method, [string] service)` 
    - returns an instance of the `Request` class
* `submitRequest([Request] request, [function] callback(response))`
    - converts a `Request` object to xml and sends it to the appropriate endpoint. It takes a function with a response parameter as the callback to be executed when the response is ready.
* `handleResponse([xmlhttprequest] xhr)`
    - an internal function that is responsible for creating a response object. It should not be called directly

`Request` has the following methods:

* `setParam([string] param, [String] value)`
    - sets a single parameter on the request object
* `setParams([object] params)`
    - takes an object of parameter value pairs and sets them on the request object. If this method is called multiple times for the same request, it continually adds to the parameters.
* `toXml()`
    - converts a `Request` object into an xml string representation. It can be called to view the xml source of a request.
* `processParams()`
    -  is an internal function that handles the creation of param xml elements. It is called by the toXml method and should not be called directly.

##Response

the callback function of the `submitRequest` method takes a parameter that holds the response from the server. This response
takes the form of a javascript object that may have the following properties

* request: The request that generated this response in the form service::method
* httpStatus: The HTTP status code response from the server
* httpStatusText: A user friendly explanation of the HTTP status code
* swStatus: The supportworks reported status of the request (ok|fail)
* error: The user friendly explanation for the failure (only if swStatus is fail)
* params: A object of param value pairs returned from the server (only if swStatus is ok)
* data: An array of objects representing rows with field:value pairs. (only if data was returned from request)

##Installation

In order to submit requests to the server from the client, a modification must be made to the apache configuration
in the file `\Hornbill\Core Services\Apache\conf\cs\core\004_proxy.conf` update it to read as follows

```LoadModule proxy_module modules/mod_proxy.so
   LoadModule proxy_http_module modules/mod_proxy_http.so
   ProxyPass "/sw/xmlmc"  "http://localhost:5015/"
   ProxyPassReverse "/sw/xmlmc"  "http://localhost:5015/"
   #ProxyRequests Off
   
   #<Proxy *>
   #    Require all denied
   #</Proxy>
```

t

Once that is complete you will need to restart the `apacheserver` service. Then to use this library, just include the 
ajax-example.js file on an html page, somewhere on the server where it is accessible via the outside. We reccomend placing
it within a subfolder of `\Hornbill\Supportworks Server\html\clisupp`

See the test_xmlmc.html file for an example.
