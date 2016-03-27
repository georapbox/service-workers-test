const CACHE_NAME = 'v5';

this.addEventListener('install', function(event) {
    function savetoCache() {
        return caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll([
                '/TRAINING/sw-test/',
                '/TRAINING/sw-test/index.html',
                '/TRAINING/sw-test/style.css',
                '/TRAINING/sw-test/app.js',
                '/TRAINING/sw-test/image-list.js',
                '/TRAINING/sw-test/star-wars-logo.jpg'
            ]);
        });
    }

    event.waitUntil(savetoCache);
});

this.addEventListener('fetch', function(event) {
    console.log('%cWORKER: fetch event in progress.', 'color:orange;');

    /* We should only cache GET requests, and deal with the rest of method in the
    client-side, by handling failed POST, PUT, PATCH, etc. requests.
    */
    if (event.request.method !== 'GET') {
        /* If we don't block the event as shown below, then the request will go to
        the network as usual.
        */
        console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
        return;
    }

    /* Similar to event.waitUntil in that it blocks the fetch event on a promise.
    Fulfillment result will be used as the response, and rejection will end in a
    HTTP response indicating failure.
    */
    event.respondWith(
        caches
            /* This method returns a promise that resolves to a cache entry matching
            the request. Once the promise is settled, we can then provide a response
            to the fetch request.
            */
            .match(event.request)
            .then(function (cached) {
                /* Even if the response is in our cache, we go to the network as well.
                This pattern is known for producing 'eventually fresh' responses,
                where we return cached responses immediately, and meanwhile pull
                a network response and store that in the cache.
                Read more:
                https://ponyfoo.com/articles/progressive-networking-serviceworker
                */
                var networked = fetch(event.request)
                    // We handle the network request with success and failure scenarios.
                    .then(fetchedFromNetwork, unableToResolve)
                    // We should catch errors on the fetchedFromNetwork handler as well.
                    .catch(unableToResolve);

                /* We return the cached response immediately if there is one, and fall
                back to waiting on the network as usual.
                */
                console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
                return cached || networked;

                function fetchedFromNetwork(response) {
                    /* We copy the response before replying to the network request.
                    This is the response that will be stored on the ServiceWorker cache.
                    */
                    var cacheCopy = response.clone();
                    console.log('%cWORKER: fetch response from network. ' + event.request.url, 'color:dodgerblue;');

                    caches
                        // We open a cache to store the response for this request.
                        .open(CACHE_NAME)
                        .then(function (cache) {
                            /* We store the response for this request. It'll later become
                            available to caches.match(event.request) calls, when looking
                            for cached responses.
                            */
                            cache.put(event.request, cacheCopy);
                        })
                        .then(function() {
                            console.log('%cWORKER: fetch response stored in cache. ' + event.request.url, 'color:green;');
                        });

                    // Return the response so that the promise is settled in fulfillment.
                    return response;
                }

                /* When this method is called, it means we were unable to produce a response
                from either the cache or the network. This is our opportunity to produce
                a meaningful response even when all else fails. It's the last chance, so
                you probably want to display a 'Service Unavailable' view or a generic
                error response.
                */
                function unableToResolve () {
                    /* There's a couple of things we can do here.
                    - Test the Accept header and then return one of the `offlineFundamentals`
                    e.g: `return caches.match('/some/cached/image.png')`
                    - You should also consider the origin. It's easier to decide what
                    'unavailable' means for requests against your origins than for requests
                    against a third party, such as an ad provider
                    - Generate a Response programmaticaly, as shown below, and return that
                    */

                    console.log('WORKER: fetch request failed in both cache and network.');

                    /* Here we're creating a response programmatically. The first parameter is the
                    response body, and the second one defines the options for the response.
                    */
                    return new Response('<h1>Service Unavailable</h1>', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/html'
                        })
                    });
                }
            })
    );
});

this.addEventListener('activate', function(event) {
    /* Just like with the install event, event.waitUntil blocks activate on a promise.
    Activation will fail unless the promise is fulfilled.
    */
    console.log('WORKER: activate event in progress.');

    event.waitUntil(
        caches
            /* This method returns a promise which will resolve to an array of availablecache keys. */
            .keys()
            .then(function (keys) {
                // We return a promise that settles when all outdated caches are deleted.
                return Promise.all(
                    keys.filter(function (key) {
                        // Filter by keys that don't start with the latest version prefix.
                        return !key.startsWith(CACHE_NAME);
                    }).map(function (key) {
                        /* Return a promise that's fulfilled
                        when each outdated cache is deleted.
                        */
                        return caches.delete(key);
                    })
                );
            })
            .then(function() {
                console.log('WORKER: activate completed.');
            })
    );
});

/*this.addEventListener('fetch', function(event) {
    event.respondWith(
        caches
            .match(event.request)
            .then(function(response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // IMPORTANT: Clone the request. A request is a stream and
                // can only be consumed once. Since we are consuming this
                // once by cache and once by the browser for fetch, we need
                // to clone the response
                var fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    function(response) {
                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have 2 stream.
                        var responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

this.addEventListener('activate', function(event) {
    var cacheWhitelist = ['v2'];
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});*/
