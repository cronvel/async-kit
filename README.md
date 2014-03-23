
# CSK Async

A simple and powerful async abstraction layer lib to easily write Node.js code.

* License: BSD
* Current status: beta
* Platform: Node.js only

While inspired in some way by [caolan/async](https://github.com/caolan/async), CSK Async uses a completely different approach.

Rather than having a whole bunch of specific functions, this lib provides a generic way to solve async code flow.
So anything that can be done by caolan/async lib can be converted to CSK Async, but the reverse is not always true.

Using natural syntax really easy to become familiar with, you will be able to code great things effortlessly, 
without cumbersome callback hell, and without coding again and again the same async pattern and logic.



# Quick example

```js
async.do.series( [
	function( callback ) {
		letsConnectToDatabase( callback ) ;
	} ,
	function( callback ) {
		letsQueryTheDatabase( callback ) ;
	} ,
	function( callback ) {
		doMoreQueries( callback ) ;
	}
] )
.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh!' ) ; }
	else { console.log( 'Yay! Done!' ) ; }
} ) ;
```

This small example prepares an async job's list and executes it. 

All jobs are executed in series, one after one.

Each callback works the Node.js way, the first argument is always the *error* argument.

If one job fails (ie it calls its callback with an error or any truthy value), all remaining jobs are skipped 
and the *exec*'s callback is instantly called with that error.

When every jobs are finished, the *exec*'s callback is called, the *results* argument contains an array of the *arguments* passed by each job to its callback.



# Features

### Code flow

* Series
* Parallel
* Race (parallel, stop when the first job finish without error)
* Waterfall (series, each job transmits its results to the next)
* While loop, do while loop
* Async if/and
* Async if/or
* Nested async if



### Modifier

* Set the parallel limit
* While conditions
* Repeat jobs a fixed amount of time
* Iterator
* Timeout for jobs (avoid pending jobs troubles)
* Retry jobs on error (useful for managing outgoing connection for example)
* Async/sync job's scheduling controle (turn sync jobs into async, change the *nice* value of the job's scheduler)
* Continue on error or not
* Transmission of all jobs' results or only results of the last job
* Then callback, if successful
* Else callback, for *async if*
* Catch callback, if an error occurs
* Finally callback, always executed
* Define input arguments to invoke *exec()* with, that are transmitted to jobs
* Export a plan as a simple function



# Install

Use Node Package Manager:

    npm install csk-async



# Plan stage & exec stage concept

This is an important concept to understand when using this lib: there are two stages to perform an async flow.

In the first stage, you define the plan.
All plan definition returns an *async.Plan* object.

Then you can *exec()* your plan as many time as you want. All the *exec* method family returns an *execContext* object.
The first time an *async.Plan* is *exec()*, it becomes locked forever: you cannot modify it anymore.

The example above becomes:

```js
// Plan stage, jobs' definition
var plan = async.do.series( [
	function( callback ) {
		letsConnectToDatabase( callback ) ;
	} ,
	function( callback ) {
		letsQueryTheDatabase( callback ) ;
	} ,
	function( callback ) {
		doMoreQueries( callback ) ;
	}
] ) ;

// Change the plan, each job should terminate within 200ms
plan.timeout( 200 ) ;

// Exec stage
plan.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh!' ) ; }
	else { console.log( 'Yay! Done!' ) ; }
} ) ;

plan.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh x2!' ) ; }
	else { console.log( 'Yay! Again!' ) ; }
} ) ;

// No effect! Plan cannot be modified anymore!
plan.timeout( 200 ) ;
```



# Callbacks & the error argument

In most case, callbacks work in the node.js fashion, except explicitly expressed otherwise.
The callback should always be called with arguments in this order:

```js
callback( [error] , [argument1] , [argument2] , ... ) ;
```

That's it: the first argument, if present, is always assumed to be the error argument.

CSK Async will assume that something is wrong with a job if it get **ANY** truthy value as the error argument,
weither it is an instanceof of *Error*, *true*, *'my error message'*, or any expression evaluated to true.
If you are unsure what are *truthy* and *falsy* values, 
[check this out](http://docs.nodejitsu.com/articles/javascript-conventions/what-are-truthy-and-falsy-values).



# Common use cases

### Perform asynchronous database queries

**Use case**: this is probably the most common use case for any website, we have to perform
a series of async query, each query should be sent after the previous one succeed.

```js
async.do.waterfall( [
	function getUserByLoginAndPassword( login , password , callback ) {
		dbUserCollection.findOne( { login: login, password: password } , callback ) ;
	} ,
	
	function getUserPhoto( userDocument , callback ) {
		dbPhotoCollection.findOne( { _id: userDocument.photoID } , callback ) ;
	}
] )
.timeout( 200 )
.then( function( photoDocument ) {
	httpResponse.writeHead( 200 , { 'Content-Type' : 'image/png' } ) ;
	httpResponse.write( photoDocument.rawData ) ;
	httpResponse.end() ;
} )
.catch( function( error ) {
	httpResponse.writeHead( 404 , { 'Content-Type' : 'text/plain' } ) ;
	httpResponse.write( '404 - Not found.' ) ;
	httpResponse.end() ;
} )
.execArgs( 'john@example.com' , 'god' ) ;
```

**Explanation**: 
- *async.waterfall()* declare a job list in *waterfall* mode, when one job finish, it pass arguments to the next job
- *dbUserCollection.findOne()* & *dbPhotoCollection.findOne* are some kind of MongoDB pseudo-code,
  they return a document from the collection
- *getUserPhoto()* receive a document of the authenticated user
- *timeout( 200 )* assume each job should perform within 200ms, if a job hit the time limit, it works as if
  the job itself passed an error to its callback, here *.catch()* is immediately triggered if it happens
- *.then()* declare a *then callback* in the *Plan* itself, it will be triggered if we manage to authenticate the user
  and get its photo
- *.catch()* declare a *catch callback* in the *Plan* itself, it will be triggered if a job fails
- *.execArgs()* is used when you do not want to pass callback to *exec()*-like function, since by default
  *exec()* assume than its last argument is the *finally callback*, so since we are in *waterfall* mode, every
  arguments passed to *execArgs()* are passed only to the first job



### Get informations on various mirror URL as fast as possible

**Use case**: we want to get some contents (JSON, HTML, RSS, etc), many mirrors are available 
but we don't want to try them one at a time, we want to try them all at once and finish 
as soon as possible, when the first non-error response is received.

```js
async.race( [ url1 , url2 , url3 , url4 ] )
.using( function( url , callback ) {
	getContentFromUrl( url , callback ) ;
} )
.then( function( contents ) {
	doSomethingWithContent( contents ) ;
} )
.catch( function( error ) {
	console.log( "Cannot get contents from any mirror" ) ;
} )
.exec() ;
```

**Explanation**: 
- *async.race()* declare a job list of four racing elements to process, in parallel mode, 
  triggering callback when the first non-error job finished
- *.using()* declare the function used to process them (iterator-like, if it means anything in a parallel context)
- *getContentFromUrl()* is a user-defined function that take an URL and a callback, try to get contents from
  that URL and call its callback the node.js way: `callback( error , contents )`
- *.then()* declare a *then callback* in the *Plan* itself, it will be triggered if we get what we want
- *doSomethingWithContent()* is a user-defined function, that process the contents
- *.catch()* declare a *catch callback* in the *Plan* itself, it will be triggered if **ALL** jobs have failed
- here *.exec()* is called without argument, so it executes the *Plan* with no callback of its own: 
  if we do not want to re-use the *Plan* it improves readability to use *.then()* and *.catch()* directly
  in the *Plan* definition part.



# Reference

*Work in progress...*



# BDD Spec (generated by mocha)



# TOC
   - [async.do.series()](#asyncdoseries)
   - [async.do.parallel()](#asyncdoparallel)
   - [Jobs](#jobs)
   - [Jobs & async.Plan.prototype.using()](#jobs--asyncplanprototypeusing)
     - [passing a function to .using()](#jobs--asyncplanprototypeusing-passing-a-function-to-using)
     - [passing an array to .using()](#jobs--asyncplanprototypeusing-passing-an-array-to-using)
   - [Jobs scheduling with async.prototype.nice()](#jobs-scheduling-with-asyncprototypenice)
   - [Jobs & async.Plan.prototype.execMap(), adding input arguments to .exec()](#jobs--asyncplanprototypeexecmap-adding-input-arguments-to-exec)
   - [async.waterfall()](#asyncwaterfall)
   - [async.race()](#asyncrace)
   - [async.while()](#asyncwhile)
   - [async.do().while()](#asyncdowhile)
   - [async.do().repeat()](#asyncdorepeat)
   - [Async conditionnal](#async-conditionnal)
     - [async.if.and()](#async-conditionnal-asyncifand)
     - [async.if.or()](#async-conditionnal-asyncifor)
     - [async.and()](#async-conditionnal-asyncand)
     - [async.or()](#async-conditionnal-asyncor)
     - [nested async.or() and async.and() in async.if()](#async-conditionnal-nested-asyncor-and-asyncand-in-asyncif)
     - [async.Plan.prototype.boolean()](#async-conditionnal-asyncplanprototypeboolean)
   - [async.Plan.prototype.then(), .else(), .catch(), .finally(), .execThenCatch(), .execThenElse() and .execThenElseCatch()](#asyncplanprototypethen-else-catch-finally-execthencatch-execthenelse-and-execthenelsecatch)
   - [async.Plan.prototype.timeout()](#asyncplanprototypetimeout)
   - [async.Plan.prototype.retry()](#asyncplanprototyperetry)
   - [Mixing async.Plan.prototype.retry() & async.Plan.prototype.timeout()](#mixing-asyncplanprototyperetry--asyncplanprototypetimeout)
   - [async.Plan.prototype.parallel()](#asyncplanprototypeparallel)
   - [async.Plan.prototype.fatal()](#asyncplanprototypefatal)
   - [async.Plan.prototype.lastJobOnly()](#asyncplanprototypelastjobonly)
<a name=""></a>
 
<a name="asyncdoseries"></a>
# async.do.series()
should run the series of job which do not have errors, in the good order, and trigger the callback with the correct result.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when a job has error, it should start running a series of job, be interrupted by that error and return it.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
	done() ;
} ) ;
```

when a function is given instead of an array of job, it should format the result using the returnLastResultOnly mode.

```js
var stats = createStats( 1 ) ;

async.do( function ( callback ) {
	asyncJob( stats , 0 , 50 , {} , [ undefined , 'my wonderful result' ] , callback ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'my wonderful result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ;
} ) ;
```

when a function is given instead of an array of job that transmit error, it should be directly transmited as the global error.

```js
var stats = createStats( 1 ) ;

async.do( function ( callback ) {
	asyncJob( stats , 0 , 50 , {} , [ new Error() , 'my wonderful result' ] , callback ) ;
} )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.equal( 'my wonderful result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncdoparallel"></a>
# async.do.parallel()
should run jobs which do not have errors in parallel, and trigger the callback with the correct result.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

when a job has error, it should start running jobs in parallel, be interrupted by that error and trigger callback with it before other pending jobs can complete.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ new Error() , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ undefined , undefined , [ new Error() , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 0, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2 ] ) ;
	done() ;
} ) ;
```

when the slower job has error, it should start running jobs in parallel, all other job complete and it trigger callback with the error.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="jobs"></a>
# Jobs
can be an array of async function accepting a completion callback.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'my' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'wonderful' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'result' ) ;
		} , 0 ) ;
	}
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of synchronous function, if it still accept and use the completion callback.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'my' ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'wonderful' ) ;
	} ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'result' ) ;
	}
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of array, each of them having a async function as the first element and then a list of argument to pass to this function, it should accept one more argument: the callback for completion being added by the async lib.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of array, each of them having a synchronous function as the first element and then a list of argument to pass to this function, if those functions still accept and use the completion callback.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ syncJob , stats , 0 , {} , [ undefined , 'my' ] ] ,
	[ syncJob , stats , 1 , {} , [ undefined , 'wonderful' ] ] ,
	[ syncJob , stats , 2 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of async.Plan, each of them will be used by calling their .exec() method.

```js
var stats = createStats( 6 ) ;

async.do.parallel( [
	async.do.series( [
		[ asyncJob , stats , 0 , 10 , {} , [ undefined , 'a' ] ] ,
		[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'nice' ] ] ,
		[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'output' ] ]
	] ) ,
	async.do.series( [
		[ asyncJob , stats , 3 , 10 , {} , [ undefined , 'my' ] ] ,
		[ asyncJob , stats , 4 , 10 , {} , [ undefined , 'wonderful' ] ] ,
		[ asyncJob , stats , 5 , 10 , {} , [ undefined , 'result' ] ]
	] )
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results[ 0 ][ 0 ] ).not.to.be.an( Error ) ;
	expect( results[ 1 ][ 0 ] ).not.to.be.an( Error ) ;
	expect( results[ 0 ][ 1 ] ).to.be.eql( [ [ undefined , 'a' ], [ undefined , 'nice' ], [ undefined , 'output' ] ] ) ;
	expect( results[ 1 ][ 1 ] ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 3, 1, 4, 2, 5 ] ) ;
	done() ;
} ) ;
```

can be an array that mix all those type of jobs.

```js
var stats = createStats( 7 ) ;

async.do.parallel( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "I'm an async anonymous function" ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , "I'm a synchronous anonymous function" ) ;
	} ,
	async.do.series( [
		[ asyncJob , stats , 2 , 20 , {} , [ undefined , 'nested' ] ] ,
		[ asyncJob , stats , 3 , 20 , {} , [ undefined , 'async.Plan' ] ] ,
		[ asyncJob , stats , 4 , 20 , {} , [ undefined , 'results' ] ]
	] ) ,
	[ syncJob , stats , 5 , {} , [ undefined , "I'm a synchronous array of function and arguments" ] ] ,
	[ asyncJob , stats , 6 , 10 , {} , [ undefined , "I'm an async array of function and arguments" ] ] ,
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , "I'm an async anonymous function" ] ,
		[ undefined , "I'm a synchronous anonymous function" ] ,
		[ undefined , [ [ undefined , "nested" ] , [ undefined , "async.Plan" ] , [ undefined , "results" ] ] ] ,
		[ undefined , "I'm a synchronous array of function and arguments" ] ,
		[ undefined , "I'm an async array of function and arguments" ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 5, 0, 6, 2, 3, 4 ] ) ;
	done() ;
} ) ;
```

objects can be used instead of array as the top container, the results should be an objects with the same properties mapping, properties' order should be preserved (*IF* they do not start with a digit - because of V8 behaviours with objects).

```js
var stats = createStats( 3 ) ;

async.do.parallel( {
	one: [ asyncJob , stats , 0 , 40 , {} , [ undefined , 'my' ] ] ,
	two: [ asyncJob , stats , 1 , 20 , {} , [ undefined , 'wonderful' ] ] ,
	three: [ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( { one: [ undefined , 'my' ], two: [ undefined , 'wonderful' ], three: [ undefined , 'result' ] } ) ;
	expect( Object.keys( results ) ).to.be.eql( [ 'one' , 'two' , 'three' ] ) ;	// Check the keys order
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeusing"></a>
# Jobs & async.Plan.prototype.using()
<a name="jobs--asyncplanprototypeusing-passing-a-function-to-using"></a>
## passing a function to .using()
should take each job as an array of arguments to pass to the .using()'s function.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.using( asyncJob )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the job is not an array, it should take each job as the first argument to pass to the .using()'s function.

```js
var id = 0 , stats = createStats( 3 ) ;

async.do( [ 'my' , 'wonderful' , 'result' ] )
.using( function( data , callback ) {
	stats.startCounter[ id ] ++ ;
	setTimeout( function() {
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		id ++ ;
		callback( undefined , data ) ;
 	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeusing-passing-an-array-to-using"></a>
## passing an array to .using()
when a job is a function, it should take the .using()'s array as argument.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	function( data , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + data.describe ) ;
		} , 20 ) ;
	} ,
	function( data , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + data.body.length ) ;
		} , 10 ) ;
	} ,
	function( data , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + data.body ) ;
		} , 0 ) ;
	}
] )
.using( [ { describe: 'some data' , body: 'blahblihblah' } ] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

<a name="jobs-scheduling-with-asyncprototypenice"></a>
# Jobs scheduling with async.prototype.nice()
using .nice( -3 ), it should run the series of job with synchonous scheduling.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -2 ), it should run the series of job with an async scheduling (nextTick).

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -2 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -1 ), it should run the series of job with an async scheduling (setImmediate).

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -1 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( 10 ), it should run the series of job with an async scheduling (setTimeout 100ms).

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( 10 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -3 ), it should run the jobs in parallel with synchonous scheduling.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( -2 ), it should run the jobs in parallel with an async scheduling (nextTick).

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -2 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( -1 ), it should run the jobs in parallel with an async scheduling (setImmediate).

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -1 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( 10 ), it should run the jobs in parallel with an async scheduling (setTimeout 100ms).

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( 10 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeexecmap-adding-input-arguments-to-exec"></a>
# Jobs & async.Plan.prototype.execMap(), adding input arguments to .exec()
using default exec()'s arguments mapping, called with no argument, it should not throw error.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "result" ) ;
			expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} , 0 ) ;
	}
] )
.exec() ;
```

using default exec()'s arguments mapping, when a job is a function, it should take the input arguments passed to .exec().

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.exec( 'some data' , 'blahblihblah' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

when a job is a function, it should take the input arguments passed to .exec().

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.execMap( [ 'finally' ] , 2 , 2 , [ 'describe' , 'body' ] )
.exec( 'some data' , 'blahblihblah' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

when mixing arguments passed to .exec() and .using(), .exec()'s arguments overlapping .using()'s arguments should overwrite.

```js
var stats ;

var asyncPlan = async.do.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.using( [ "<insert .using()'s description here>" , "<insert .using()'s body here>" ] )
.execMap( [ 'finally' ] , 0 , 2 , [ 'describe' , 'body' ] ) ;

stats = createStats( 3 ) ;

asyncPlan.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , "DESCRIPTION: <insert .using()'s description here>" ] ,
		[ undefined , 'LENGTH: 29' ] ,
		[ undefined , "BODY: <insert .using()'s body here>" ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	
	stats = createStats( 3 ) ;
	
	asyncPlan.exec( "<insert .exec()'s description here>" , function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( results ).to.be.eql( [
			[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
			[ undefined , 'LENGTH: 29' ] ,
			[ undefined , "BODY: <insert .using()'s body here>" ]
		] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
		
		stats = createStats( 3 ) ;
		
		asyncPlan.exec( "<insert .exec()'s description here>" , "<insert .exec()'s body here>" , function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.be.eql( [
				[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
				[ undefined , 'LENGTH: 28' ] ,
				[ undefined , "BODY: <insert .exec()'s body here>" ]
			] ) ;
			expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;
```

<a name="asyncwaterfall"></a>
# async.waterfall()
should run the series of job in waterfall mode: each job received the result of the previous, the final result is the result of the last job, the first job receive arguments from exec(), if any.

```js
var stats = createStats( 3 ) ;

async.waterfall( [
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' my' ) ;
		} , 10 ) ;
	} ,
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' wonderful' ) ;
		} , 20 ) ;
	} ,
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' result' ) ;
		} , 0 ) ;
	}
] )
.exec( 'oh' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'oh my wonderful result' ) ;
	done() ;
} ) ;
```

using async.Plan.prototype.transmitError(), each job received the full list of arguments transmited by the previous job, including the error argument taht is truncated by default.

```js
var stats = createStats( 3 ) ;

async.waterfall( [
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' my' ) ;
		} , 10 ) ;
	} ,
	function( error , str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' wonderful' ) ;
		} , 20 ) ;
	} ,
	function( error , str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' result' ) ;
		} , 0 ) ;
	}
] )
.transmitError()
.exec( 'oh' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'oh my wonderful result' ) ;
	done() ;
} ) ;
```

<a name="asyncrace"></a>
# async.race()
should run parallel racing jobs, and should trigger the callback after the fastest job complete, with the winning job's results only.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'wonderful' ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 1, 0 ] ) ;
	done() ;
} ) ;
```

when some jobs have errors, it should return after the fastest successful job, other failed results are discarded.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2 ] ) ;
	done() ;
} ) ;
```

when all jobs have errors, it should return an error.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 100 , {} , [ new Error() , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ new Error() , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncwhile"></a>
# async.while()
while the while()'s callback's result is true, it should run jobs in series (by default), and do it again and again, the final result contain only the last iteration.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the while()'s callback has an error, no more iteration are performed, the last iteration results are transmitted, but the error in the while is transmitted as well.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ? true : new Error() ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when using async.Plan.prototype.parallel(), it should run jobs in parallel, and start a new iteration only when all jobs in the current iteration have been completed, other behaviour are the same like in series.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.parallel( Infinity )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0, 1, 2, 0, 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

when the first call to while()'s callback's result is false, no jobs are even started, and the final result is empty.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( false ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [] ) ;
	expect( whileCount ).to.be.equal( 1 ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 0, 0 ] ) ;
	expect( stats.order ).to.be.eql( [] ) ;
	done() ;
} ) ;
```

<a name="asyncdowhile"></a>
# async.do().while()
should work the same way as async.while() except that the while()'s callback's is evaluated at the end of the loop.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 4, 4 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

so even if the first call to while()'s callback's result is false, the first iteration is already done.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( false ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 1 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="asyncdorepeat"></a>
# async.do().repeat()
should repeat the action the given time.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.repeat( 4 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 4, 4 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal"></a>
# Async conditionnal
<a name="async-conditionnal-asyncifand"></a>
## async.if.and()
should evaluate async truthy && truthy && truthy to true, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async truthy && falsy && truthy to false, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy && falsy && falsy to false, and run just the first job.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncifor"></a>
## async.if.or()
should evaluate async truthy || truthy || truthy to true, and run only the first jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy || truthy || falsy to true, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy || falsy || falsy to false, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncand"></a>
## async.and()
should evaluate async true && 7 && 'wonderful' to 'wonderful', and run all jobs.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 'wonderful' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async true && 0 && 'wonderful' to 0, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 0 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 0 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined && null && false to undefined, and run just the first job.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( undefined ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncor"></a>
## async.or()
should evaluate async 7 || true || 'wonderful' to 7, and run only the first jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined || 7 || false to 7, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined || null || '' to '', and run all jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ '' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( '' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-nested-asyncor-and-asyncand-in-asyncif"></a>
## nested async.or() and async.and() in async.if()
should evaluate async ( truthy || falsy ) && truthy to true, and run first and third jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	async.or( [
		[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( falsy || truthy ) && falsy to false, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	async.or( [
		[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( truthy && falsy ) || truthy to true, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	async.and( [
		[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( falsy && truthy ) || falsy to false, and run the first and third jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	async.and( [
		[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncplanprototypeboolean"></a>
## async.Plan.prototype.boolean()
should force async.and()'s result to be a boolean, so 'wonderful' && 7 should evaluate to true.

```js
var stats = createStats( 2 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
] )
.boolean()
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1 ] ) ;
	done() ;
} ) ;
```

using .boolean( false ), it should force async.if.and()'s result to preserve the last evaluated value (the javascript way), so 'wonderful' && 7 should evaluate to 7.

```js
var stats = createStats( 2 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
] )
.boolean( false )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypethen-else-catch-finally-execthencatch-execthenelse-and-execthenelsecatch"></a>
# async.Plan.prototype.then(), .else(), .catch(), .finally(), .execThenCatch(), .execThenElse() and .execThenElseCatch()
should run a series of successful jobs and trigger in-plan and in-exec then() and finally().

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.then( function( results ) {
	stats.plan.then ++ ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
} )
.catch( function( error , results ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( error , results ) {
	stats.plan.finally ++ ;
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
} )
.execThenCatch( 
	function( results ) {
		stats.exec.then ++ ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	} ,
	function( error , results ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
		expect( stats.plan.then ).to.be.equal( 1 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 1 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should run a series of jobs, interrupted by an error, and trigger in-plan and in-exec catch() and finally().

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.then( function( results ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.catch( function( error , results ) {
	stats.plan.catch ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
} )
.finally( function( error , results ) {
	stats.plan.finally ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
} )
.execThenCatch(
	function( results ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( error , results ) {
		stats.exec.catch ++ ;
		expect( error ).to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
	} ,
	function( error , results ) {
		expect( error ).to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && truthy && truthy to true, and trigger in-plan and in-exec then() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	done( new Error( "Should not trigger else()" ) ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		expect( result ).to.be.equal( true ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		done( new Error( "Should not trigger else()" ) ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( result ) {
		expect( result ).to.be.equal( true ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.plan.then ).to.be.equal( 1 ) ;
		expect( stats.plan.else ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 1 ) ;
		expect( stats.exec.else ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && falsy && truthy to false, and trigger in-plan and in-exec else() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 0 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		expect( result ).to.be.equal( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( result ) {
		expect( result ).to.be.equal( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 1 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 1 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && Error && truthy to Error, and trigger in-plan and in-exec catch() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	done( new Error( "Should not trigger else()" ) ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		done( new Error( "Should not trigger else()" ) ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		expect( error ).to.be.an( Error ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( result ) {
		expect( result ).to.be.an( Error ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

when there isn't any catch() and a job has an error, it should trigger in-plan and in-exec else() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	expect( result ).to.be( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElse(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		expect( result ).to.be( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( result ) {
		expect( result ).to.be( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

<a name="asyncplanprototypetimeout"></a>
# async.Plan.prototype.timeout()
should abort job in a series that take too much time to complete, its result should be an error.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ new Error() ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ; 
} ) ;
```

should abort job in a parallel flow that take too much time to complete, its result should be an error.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ new Error() ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 2 ] ) ;
	done() ; 
} ) ;
```

<a name="asyncplanprototyperetry"></a>
# async.Plan.prototype.retry()
should retry a series of job with failure the good amount of time, in the good order, then succeed and return the good results.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
] )
.retry( 10 , 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 6, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2 ] ) ;
	done() ; 
} ) ;
```

should retry parallel jobs with failure the good amount of time, then succeed and return the good results.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
] )
.retry( 10 , 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 6, 3 ] ) ;
	// stats.order is not relevant here
	done() ; 
} ) ;
```

<a name="mixing-asyncplanprototyperetry--asyncplanprototypetimeout"></a>
# Mixing async.Plan.prototype.retry() & async.Plan.prototype.timeout()
when a job timeout and is still pending, it should be retried, if the second try complete before, it transmit its result.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
	function( callback ) {
		var timeout , result ;
		
		stats.startCounter[ 1 ] ++ ;
		timeout = 0 ;
		
		switch ( stats.startCounter[ 1 ] )
		{
			case 1 : result = '1st' ; timeout = 100 ; break ;
			case 2 : result = '2nd' ; break ;
			case 3 : result = '3rd' ; break ;
			default : result = '' + stats.startCounter[ 1 ] + 'th' ; break ;
		}
		
		setTimeout( function() {
			stats.endCounter[ 1 ] ++ ;
			stats.order.push( 1 ) ;
			callback( undefined , result ) ;
		} , timeout ) ;
	} ,
	[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.retry( 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , '2nd' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.startCounter ).to.be.eql( [ 1, 2, 1 ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ; 
} ) ;
```

be careful when mixing .timeout() and .retry(), if a job timeout and retry, the first try may finally complete before other try, so it should return the result of the first try to complete.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
	function( callback ) {
		var timeout , result ;
		
		stats.startCounter[ 1 ] ++ ;
		timeout = 50 ;
		
		switch ( stats.startCounter[ 1 ] )
		{
			case 1 : result = '1st' ; break ;
			case 2 : result = '2nd' ; break ;
			case 3 : result = '3rd' ; break ;
			default : result = '' + stats.startCounter[ 1 ] + 'th' ; break ;
		}
		
		setTimeout( function() {
			stats.endCounter[ 1 ] ++ ;
			stats.order.push( 1 ) ;
			callback( undefined , result ) ;
		} , timeout ) ;
	} ,
	[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.retry( 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , '1st' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.startCounter ).to.be.eql( [ 1, 3, 1 ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ; 
} ) ;
```

<a name="asyncplanprototypeparallel"></a>
# async.Plan.prototype.parallel()
should run parallel jobs, with a limit of jobs running at a time.

```js
var stats = createStats( 6 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 60 , {} , [ undefined , 'one' ] ] ,	// @60
	[ asyncJob , stats , 1 , 20 , {} , [ undefined , 'two' ] ] ,	// @20
	[ asyncJob , stats , 2 , 40 , {} , [ undefined , 'three' ] ] ,	// @40
	[ asyncJob , stats , 3 , 0 , {} , [ undefined , 'four' ] ] ,	// @20+
	[ asyncJob , stats , 4 , 30 , {} , [ undefined , 'five' ] ] ,	// @50+
	[ asyncJob , stats , 5 , 0 , {} , [ undefined , 'six' ] ]	// @40+
] )
.parallel( 3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined, 'one' ], [ undefined, 'two' ], [ undefined, 'three' ], [ undefined, 'four' ], [ undefined, 'five' ], [ undefined, 'six' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 3, 2, 5, 4, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypefatal"></a>
# async.Plan.prototype.fatal()
should run the series of job and continue on error.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.fatal( false )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

should run parallel jobs and continue on error.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.fatal( false )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypelastjobonly"></a>
# async.Plan.prototype.lastJobOnly()
should run the series of job and pass only the results of the last job.

```js
var stats = createStats( 3 ) ;

async.do.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.lastJobOnly()
.exec( function() {
	var args = Array.prototype.slice.call( arguments ) ;
	expect( args ).to.be.eql( [ undefined , 'result' ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

should run jobs in parallel and pass only the results of the last job - can produce random result with parallel mode!.

```js
var stats = createStats( 3 ) ;

async.do.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.lastJobOnly()
.exec( function() {
	var args = Array.prototype.slice.call( arguments ) ;
	expect( args ).to.be.eql( [ undefined , 'wonderful' ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

