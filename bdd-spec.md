# TOC
   - [async.do.series()](#asyncdoseries)
     - [Basic](#asyncdoseries-basic)
     - [Niceness of scheduling](#asyncdoseries-niceness-of-scheduling)
   - [async.do.parallel()](#asyncdoparallel)
     - [Basic](#asyncdoparallel-basic)
     - [Niceness of scheduling](#asyncdoparallel-niceness-of-scheduling)
   - [Jobs](#jobs)
   - [Jobs & async.Plan.prototype.using()](#jobs--asyncplanprototypeusing)
     - [passing a function to .using()](#jobs--asyncplanprototypeusing-passing-a-function-to-using)
     - [passing an array to .using()](#jobs--asyncplanprototypeusing-passing-an-array-to-using)
   - [Jobs & async.Plan.prototype.execMap(), adding input arguments to .exec()](#jobs--asyncplanprototypeexecmap-adding-input-arguments-to-exec)
   - [async.waterfall()](#asyncwaterfall)
   - [async.race()](#asyncrace)
   - [async.while()](#asyncwhile)
   - [async.do().while()](#asyncdowhile)
   - [async.do().repeat()](#asyncdorepeat)
   - [Async logic](#async-logic)
     - [async.if.and()](#async-logic-asyncifand)
     - [async.if.or()](#async-logic-asyncifor)
     - [async.and()](#async-logic-asyncand)
     - [async.or()](#async-logic-asyncor)
     - [nested async.or() and async.and() in async.if()](#async-logic-nested-asyncor-and-asyncand-in-asyncif)
     - [async.Plan.prototype.boolean()](#async-logic-asyncplanprototypeboolean)
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
<a name="asyncdoseries-basic"></a>
## Basic
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

<a name="asyncdoseries-niceness-of-scheduling"></a>
## Niceness of scheduling
using async.Plan.prototype.nice( -3 ), it should run the series of job with synchonous scheduling, with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( -2 ), it should run the series of job with an async scheduling (nextTick), with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( -1 ), it should run the series of job with an async scheduling (setImmediate), with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( 10 ), it should run the series of job with an async scheduling (setTimeout 100ms), with the same behaviour described in Basic.

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

<a name="asyncdoparallel"></a>
# async.do.parallel()
<a name="asyncdoparallel-basic"></a>
## Basic
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

<a name="asyncdoparallel-niceness-of-scheduling"></a>
## Niceness of scheduling
using async.Plan.prototype.nice( -3 ), it should run the jobs in parallel with synchonous scheduling, with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( -2 ), it should run the jobs in parallel with an async scheduling (nextTick), with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( -1 ), it should run the jobs in parallel with an async scheduling (setImmediate), with the same behaviour described in Basic.

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

using async.Plan.prototype.nice( 10 ), it should run the jobs in parallel with an async scheduling (setTimeout 100ms), with the same behaviour described in Basic.

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

<a name="jobs--asyncplanprototypeexecmap-adding-input-arguments-to-exec"></a>
# Jobs & async.Plan.prototype.execMap(), adding input arguments to .exec()
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
.execMap( [ 'finally' ] , 1 , 1 , [ 'input' ] )
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
.execMap( [ 'finally' ] , 1 , 1 , [ 'input' ] )
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

<a name="async-logic"></a>
# Async logic
<a name="async-logic-asyncifand"></a>
## async.if.and()
should evaluate async truthly && truthly && truthly to true, and run all jobs.

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

should evaluate async truthly && falsy && truthly to false, and run just the first and second jobs.

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

<a name="async-logic-asyncifor"></a>
## async.if.or()
should evaluate async truthly || truthly || truthly to true, and run only the first jobs.

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

should evaluate async falsy || truthly || falsy to true, and run just the first and second jobs.

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

<a name="async-logic-asyncand"></a>
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

<a name="async-logic-asyncor"></a>
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

<a name="async-logic-nested-asyncor-and-asyncand-in-asyncif"></a>
## nested async.or() and async.and() in async.if()
should evaluate async ( truthly || falsy ) && truthly to true, and run first and third jobs.

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

should evaluate async ( falsy || truthly ) && falsy to false, and run all jobs.

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

should evaluate async ( truthly && falsy ) || truthly to true, and run all jobs.

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

should evaluate async ( falsy && truthly ) || falsy to false, and run the first and third jobs.

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

<a name="async-logic-asyncplanprototypeboolean"></a>
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

should evaluate async truthly && truthly && truthly to true, and trigger in-plan and in-exec then() and finally().

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

should evaluate async truthly && falsy && truthly to false, and trigger in-plan and in-exec else() and finally().

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

should evaluate async truthly && Error && truthly to Error, and trigger in-plan and in-exec catch() and finally().

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

