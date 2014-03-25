/*
	The Cedric's Swiss Knife (CSK) - CSK Async lib

	Copyright (c) 2009, 2010, 2011, 2012, 2013, 2014 Cédric Ronvel 
	All rights reserved.

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:

	1. Redistributions of source code must retain the above copyright notice, this
	   list of conditions and the following disclaimer.
	2. Redistributions in binary form must reproduce the above copyright notice,
	   this list of conditions and the following disclaimer in the documentation
	   and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
	ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/



// Async flow


/*
	TODO:
	- this: in all callback and event, it would be nice to bind the current execContext as 'this',
	  so for example each jobs can access to results of others...
	  -> DONE for callback but not for event
	- serialProgress() callback/event that is called for each element, but that respect sequence order 
	  even in parallel mode
	- config(): just set everything in one place?
	- dependenciesTree(): jobs are resolved using a dependencies' tree, that give arguments to transmit
	  from one Async function to another
	- async.Queue: job can be added after exec(), forever, until quit() is called (it needs some brainstorming here),
	  basicaly, some work should be done to move jobs from async.Plan to async.ExecContext
	- Async map/reduce/filter
	- caolan/async's: compose(), detect()
	- Real async try/catch/finally, using node's Domain?
	- exportProxy() export a proxy function, if you call the function twice (or more) with the same arguments,
	  the subsequent call will process immediately, replaying all callback immediately and returning,
	  all with the same value
	
	TODO Promises:
	- promise() returning a Promise
	- Promise as a job item, or action function
	
	TODO Doc:
	- Jeu de piste/Organigramme en Markdown, de simples questions proposent des liens en réponse,
	  menant sur d'autres questions avec d'autres liens de réponses, etc... à la fin, on obtient
	  un code d'exemple qui sert de template à copier/coller.
*/



// Load modules dependencies
var events = require( 'events' ) ;
var extend = require( 'extend' ) ;



// Create the base object and export it
var async = {} ;
module.exports = async ;



			/////////////////////////
			// Async Event Emitter //
			/////////////////////////



// Extend EventEmitter, to allow asyncEmit
async.EventEmitter = function EventEmitter( asyncNice )
{
	this.asyncNice = parseInt( asyncNice ) ;
} ;

async.EventEmitter.prototype = Object.create( events.EventEmitter.prototype ) ;
async.EventEmitter.prototype.constructor = async.EventEmitter ;



// Send an event, the async way
async.EventEmitter.prototype.asyncEmit = function asyncEmit()
{
	var self = this , nice , args ;
	
	if ( typeof arguments[ 0 ] === 'number' )
	{
		nice = arguments[ 0 ] ;
		args = Array.prototype.slice.call( arguments , 1 ) ;
	}
	else
	{
		nice = this.asyncNice ;
		args = arguments ;
	}
	
	if ( nice === undefined )  nice = -1 ;
	
	switch ( nice )
	{
		case -3 : self.emit.apply( self , args ) ; break ;
		case -2 : process.nextTick( function() { self.emit.apply( self , args ) ; } ) ; break ;
		case -1 : setImmediate( function() { self.emit.apply( self , args ) ; } ) ; break ;
		default : setTimeout( function() { self.emit.apply( self , args ) ; } , self.asyncNice * 10 ) ; break ;
	}
	
	return this ;
} ;

// Set the nice value for this emitter
// -3 is synchronous (use carefully! this modify the controle flow!)
// -2 is the fastest asynchronous (it uses process.nextTick())
// -1 use setImmediate() (the default)
// >=0 use setTimeout() with 10 x nice ms of delay
async.EventEmitter.prototype.nice = function nice( asyncNice )
{
	this.asyncNice = parseInt( asyncNice ) ;
	return this ;
} ;



			///////////////////////////////////
			// Async Plan object: what to do //
			///////////////////////////////////



// Empty constructor, it is just there to support instanceof operator
async.Plan = function Plan()
{
	throw new Error( "[async] Cannot create an async Plan object directly" ) ;
} ;

//async.Plan.prototype = Object.create( async.EventEmitter.prototype ) ;
async.Plan.prototype.constructor = async.Plan ;



// Common properties for all instance of async.Plan
var planCommonProperties = {
	race: { value: false , writable: true , enumerable: true , configurable: true } ,
	waterfall: { value: false , writable: true , enumerable: true , configurable: true } ,
	waterfallTransmitError: { value: false , writable: true , enumerable: true , configurable: true } ,
	whileAction: { value: undefined , writable: true , enumerable: true , configurable: true } ,
	whileActionBefore: { value: false , writable: true , enumerable: true , configurable: true } ,
	errorsAreFatal: { value: true , writable: true , enumerable: true , configurable: true } ,
	
	jobsData: { value: {} , writable: true , enumerable: true } ,
	jobsKeys: { value: [] , writable: true , enumerable: true } ,
	jobsUsing: { value: undefined , writable: true , enumerable: true } ,
	jobsTimeout: { value: undefined , writable: true , enumerable: true } ,
	returnLastJobOnly: { value: false , writable: true , enumerable: true } ,
	usingIsIterator: { value: false , writable: true , enumerable: true } ,
	thenAction: { value: undefined , writable: true , enumerable: true } ,
	catchAction: { value: undefined , writable: true , enumerable: true } ,
	finallyAction: { value: undefined , writable: true , enumerable: true } ,
	asyncEventNice: { value: -3 , writable: true , enumerable: true } ,
	maxRetry: { value: 0 , writable: true , enumerable: true } ,
	retryTimeout: { value: 0 , writable: true , enumerable: true } ,
	retryMultiply: { value: 1 , writable: true , enumerable: true } ,
	retryMaxTimeout: { value: Infinity , writable: true , enumerable: true } ,
	execMapMinInputs: { value: 0 , writable: true , enumerable: true } ,
	execMapMaxInputs: { value: 100 , writable: true , enumerable: true } ,
	execMapCallbacks: { value: [ 'finally' ] , writable: true , enumerable: true } ,
	execMapMinArgs: { value: 0 , writable: true , enumerable: true } ,
	execMapMaxArgs: { value: 101 , writable: true , enumerable: true } ,
	execMapSignature: { value: '( [finallyCallback] )' , writable: true , enumerable: true } ,
	locked: { value: false , writable: true , enumerable: true }
} ;



// Set if errors are fatal or not
async.Plan.prototype.fatal = function fatal( errorsAreFatal )
{
	if ( ! this.locked ) { this.errorsAreFatal = errorsAreFatal || errorsAreFatal === undefined ? true : false ; } 
	return this ;
} ;

// Cast logic jobs to boolean
async.Plan.prototype.boolean = function boolean( castToBoolean )
{
	if ( ! this.locked ) { this.castToBoolean = castToBoolean || castToBoolean === undefined ? true : false ; }
	return this ;
} ;

// Transmit error, in waterfall mode
async.Plan.prototype.transmitError = function transmitError( waterfallTransmitError )
{
	if ( ! this.locked ) { this.waterfallTransmitError = waterfallTransmitError || waterfallTransmitError === undefined ? true : false ; }
	return this ;
} ;

// Set the timeout for each jobs, the callback will be called with an async error for each of them that timeout
async.Plan.prototype.timeout = function timeout( jobsTimeout )
{
	if ( ! this.locked ) { this.jobsTimeout = jobsTimeout ; }
	return this ;
} ;

// Set if only the last job's results should be passed to the callback
async.Plan.prototype.lastJobOnly = function lastJobOnly( returnLastJobOnly )
{
	if ( ! this.locked ) { this.returnLastJobOnly = returnLastJobOnly || returnLastJobOnly === undefined ? true : false ; }
	return this ;
} ;

// Set if using() is an iterator (like async.foreach()), if so, the whole job is transmitted as one argument rather than an argument list
async.Plan.prototype.usingIterator = function usingIterator( usingIsIterator )
{
	if ( ! this.locked ) { this.usingIsIterator = usingIsIterator || usingIsIterator === undefined ? true : false ; }
	return this ;
} ;



// Return a clone of the object
async.Plan.prototype.clone = function clone()
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	extend( asyncPlan , this ) ;
	asyncPlan.locked = false ;
	return asyncPlan ;
} ;



// Set the async'ness of the flow, even sync jobs can be turned async
async.Plan.prototype.nice = function nice( asyncEventNice )
{
	if ( this.locked ) { return this ; }
	
	if ( asyncEventNice === undefined || asyncEventNice === null || asyncEventNice === true ) { this.asyncEventNice = -1 ; }
	else if ( asyncEventNice === false ) { this.asyncEventNice = -3 ; }
	else { this.asyncEventNice = asyncEventNice ; }
	
	return this ;
} ;



// Set jobs
async.Plan.prototype.do = function _do( jobsData )
{
	if ( this.locked ) { return this ; }
	
	if ( jobsData !== null && typeof jobsData === 'object' ) { this.jobsData = jobsData ; }
	else if ( typeof jobsData === 'function' )  { this.jobsData = [ jobsData ] ; this.returnLastJobOnly = true ; }
	else { this.jobsData = {} ; }
	
	this.jobsKeys = Object.keys( this.jobsData ) ;
	this.results = Array.isArray( this.jobsData ) ? [] : {} ;
	
	return this ;
} ;



// Set number of jobs running in parallel
async.Plan.prototype.parallel = function parallel( parallelLimit )
{
	if ( this.locked ) { return this ; }
	
	if ( parallelLimit === undefined ) { this.parallelLimit = Infinity ; }
	else if ( typeof parallelLimit === 'number' ) { this.parallelLimit = parallelLimit ; }
	
	return this ;
} ;



// Set how to retry jobs in error
async.Plan.prototype.retry = function retry( maxRetry , timeout , multiply , maxTimeout )
{
	if ( this.locked ) { return this ; }
	
	if ( typeof maxRetry === 'number' )  this.maxRetry = maxRetry ;
	if ( typeof timeout === 'number' )  this.retryTimeout = timeout ;
	if ( typeof multiply === 'number' )  this.retryMultiply = multiply ;
	if ( typeof maxTimeout === 'number' )  this.retryMaxTimeout = maxTimeout ;
	
	return this ;
} ;



// Set the performer of the jobs: if set, do() is not feeded by callback but by arguments for this single callback function.
// The performer function should accept a callback as its last argument, in the nodejs' way.
async.Plan.prototype.using = function using( jobsUsing )
{
	if ( ! this.locked )  this.jobsUsing = jobsUsing ;
	return this ;
} ;



// Same as using(), but the given function receive an uniq "element" containing the whole job as its first argument:
// it is like using().usingIterator(), a behaviour similar to the async.foreach() factory
async.Plan.prototype.iterator = function iterator( iterator )
{
	if ( this.locked ) { return this ; }
	this.jobsUsing = iterator ;
	this.usingIsIterator = true ;
	return this ;
} ;



// Set while action.
// Here, simple callback is mandatory, since it should process its inputs correctly in order to loop or not.
// If whileActionBefore is given and truthy, then it makes a do( jobs ).while( callback , true ) the same as while( whileAction ).do( jobs ):
// the while condition is evaluated before any jobs are processed.
// Write this form only for non-trivial uses.
async.Plan.prototype.while = function _while( whileAction , whileActionBefore )
{
	if ( this.locked ) { return this ; }
	this.whileAction = whileAction ;
	this.whileActionBefore = whileActionBefore ? true : false ; 
	return this ;
} ;



// Set the number of time to repeat the action.
// It is the same as while(), provided with a simple counter function.
async.Plan.prototype.repeat = function repeat( n )
{
	if ( this.locked ) { return this ; }
	
	var i = 0 ;
	
	if ( typeof n !== 'number' )  n = parseInt( n ) ;
	this.whileActionBefore = true ;
	
	this.whileAction = function( error , results , callback ) {
		// callback should be called last, to avoid sync vs async mess, hence i++ come first, and we check i<=n rather than i<n
		i ++ ;
		callback( i <= n ) ;
	} ;
	
	return this ;
} ;



// Set race mode: we stop processing jobs when the first non-error job finish.
// Notice: when using race() this way (without the async.race() factory), you have to call .fatal( false ) too if you want the same behaviour.
async.Plan.prototype.race = function race( race )
{
	if ( ! this.locked ) { this.race = race || race === undefined ? true : false ; }
	return this ;
} ;



// Set waterfall mode: each job pass its results to the next job.
// Be careful, this does not support parallel mode ATM, but may fail silently.
// TODO: should probably raise an exception if we use parallel mode.
async.Plan.prototype.waterfall = function waterfall( waterfall )
{
	if ( ! this.locked ) { this.waterfall = waterfall || waterfall === undefined ? true : false ; }
	return this ;
} ;




// Set action to do on completion.
// If catch() or else() are present and match, then() is not triggered.
async.Plan.prototype.then = function then( thenAction )
{
	if ( ! this.locked )  this.thenAction = thenAction ;
	return this ;
} ;



// Set action to do on error
async.Plan.prototype.catch = function _catch( catchAction )
{
	if ( ! this.locked )  this.catchAction = catchAction || true ;
	return this ;
} ;



// Set action to do, that trigger whether it has triggered or not any of then()/catch()/else()
async.Plan.prototype.finally = function _finally( finallyAction )
{
	if ( ! this.locked )  this.finallyAction = finallyAction || true ;
	return this ;
} ;



// Set action to do on logical false status
async.Plan.prototype.else = function _else( elseAction )
{
	if ( ! this.locked )  this.elseAction = elseAction || true ;
	return this ;
} ;



// Internal exec of callback-like job/action
async.Plan.prototype.execJob = function execJob( execContext , job , indexOfKey )
{
	var self = this , args , key = this.jobsKeys[ indexOfKey ] ;
	
	if ( typeof this.jobsUsing === 'function' )
	{
		if ( Array.isArray( job ) && ! this.usingIsIterator )
		{
			job.push( this.execCallback.bind( this , execContext , indexOfKey ) ) ;
			this.jobsUsing.apply( execContext , job ) ;
			job.pop() ;
		}
		else
		{
			this.jobsUsing.call( execContext , job , this.execCallback.bind( this , execContext , indexOfKey ) ) ;
		}
	}
	else if ( typeof job === 'function' )
	{
		if ( this.waterfall && indexOfKey > 0 )
		{
			// remove the first, error arg if waterfallTransmitError is false
			//console.log( index , key , execContext.results ) ;
			args = execContext.results[ this.jobsKeys[ indexOfKey - 1 ] ].slice( this.waterfallTransmitError ? 0 : 1 ) ;
			args.push( this.execCallback.bind( this , execContext , indexOfKey ) ) ;
			job.apply( execContext , args ) ;
		}
		else if ( Array.isArray( this.jobsUsing ) || this.execMapMaxInputs )
		{
			if ( Array.isArray( this.jobsUsing ) )  args = extend( [] , this.jobsUsing , execContext.execInputs ) ;
			else  args = extend( [] , execContext.execInputs ) ;
			
			args.push( this.execCallback.bind( this , execContext , indexOfKey ) ) ;
			job.apply( execContext , args ) ;
		}
		else
		{
			job.call( execContext , this.execCallback.bind( this , execContext , indexOfKey ) ) ;
		}
	}
	else if ( Array.isArray( job ) && typeof job[ 0 ] === 'function' )
	{
		args = job.slice( 1 ) ;
		args.push( this.execCallback.bind( this , execContext , indexOfKey ) ) ;
		job[ 0 ].apply( execContext , args ) ;
	}
	else if ( typeof job === 'object' && job instanceof async.Plan )
	{
		// What to do with jobUsing and execContext.execInputs here? Same as if( typeof job === 'function' ) ?
		job.exec( this.execCallback.bind( this , execContext , indexOfKey ) ) ;
	}
	else
	{
		this.execCallback.call( this , execContext , indexOfKey ) ;
		return this ;
	}
	
	
	// Timers management
	if ( execContext.jobsTimeoutTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.jobsTimeoutTimers[ key ] ) ;
		execContext.jobsTimeoutTimers[ key ] = undefined ;
	}
	
	if ( execContext.retriesTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.retriesTimers[ key ] ) ;
		execContext.retriesTimers[ key ] = undefined ;
	}
	
	if ( typeof this.jobsTimeout === 'number' && this.jobsTimeout !== Infinity )
	{
		execContext.jobsTimeoutTimers[ key ] = setTimeout( function() {
			//console.log( "        >>>> Job's Timeout !!! <<<<        for key: " , key ) ;
			execContext.jobsTimeoutTimers[ key ] = undefined ;
			self.execCallback.call( self , execContext , indexOfKey , new Error( "Job timeout reached" ) ) ;
		} , this.jobsTimeout ) ;
	}
	
	return this ;
} ;



// Internal exec of callback-like action
async.Plan.prototype.execAction = function execAction( execContext , action , args )
{
	// call the matching action
	if ( typeof action === 'function' )
	{
		action.apply( execContext , args ) ;
	}
	else if ( typeof action === 'object' && action instanceof async.Plan )
	{
		action.exec() ;
	}
} ;



async.Plan.prototype.execMap = function execMap( callbacks , minInputs , maxInputs , inputsName )
{
	if ( this.locked ) { return this ; }
	
	var i , j , maxUnnamed = 5 ;
	
	minInputs = parseInt( minInputs ) ;
	maxInputs = parseInt( maxInputs ) ;
	
	if ( minInputs < maxInputs )
	{
		this.execMapMinInputs = minInputs ;
		this.execMapMaxInputs = maxInputs ;
	}
	else
	{
		// User is stOopid, swap...
		this.execMapMinInputs = maxInputs ;
		this.execMapMaxInputs = minInputs ;
	}
	
	this.execMapCallbacks = Array.isArray( callbacks ) ? callbacks : [] ;
	this.execMapInputsName = Array.isArray( inputsName ) ? inputsName : [] ;
	this.execMapSignature = '(' ;
	
	if ( this.execMapMinInputs === this.execMapMaxInputs )
	{
		// Fixed input count, variable callback count possible
		this.execMapMinArgs = this.execMapMinInputs ;
		this.execMapMaxArgs = this.execMapMaxInputs + this.execMapCallbacks.length ;
		
		for ( i = 0 ; i < this.execMapMaxInputs ; i ++ )
		{
			if ( i > 0 )  this.execMapSignature += ', ' ;
			if ( i >= maxUnnamed && typeof this.execMapInputsName[ i ] !== 'string' )  { this.execMapSignature += '... ' ; break ; }
			
			this.execMapSignature += typeof this.execMapInputsName[ i ] === 'string' ? this.execMapInputsName[ i ] : 'arg#' + ( i + 1 ) ;
		}
		
		for ( j = 0 ; j < this.execMapCallbacks.length ; j ++ )
		{
			if ( i + j > 0 )  this.execMapSignature += ', ' ;
			this.execMapSignature += '[' + this.execMapCallbacks[ j ] + 'Callback]' ;
		}
	}
	else
	{
		// Variable input count, fixed callback count
		this.execMapMinArgs = this.execMapMinInputs + this.execMapCallbacks.length ;
		this.execMapMaxArgs = this.execMapMaxInputs + this.execMapCallbacks.length ;
		
		for ( i = 0 ; i < this.execMapMaxInputs ; i ++ )
		{
			if ( i > 0 )  this.execMapSignature += ', ' ;
			
			if ( i < this.execMapMinInputs )
			{
				if ( i >= maxUnnamed && typeof this.execMapInputsName[ i ] !== 'string' )  { this.execMapSignature += '... ' ; break ; }
				this.execMapSignature += typeof this.execMapInputsName[ i ] === 'string' ? this.execMapInputsName[ i ] : 'arg#' + ( i + 1 ) ;
			}
			else
			{
				if ( i >= maxUnnamed && typeof this.execMapInputsName[ i ] !== 'string' )  { this.execMapSignature += '[...] ' ; break ; }
				this.execMapSignature += '[' + ( typeof this.execMapInputsName[ i ] === 'string' ? this.execMapInputsName[ i ] : 'arg#' + ( i + 1 ) ) + ']' ;
			}
		}
		
		for ( j = 0 ; j < this.execMapCallbacks.length ; j ++ )
		{
			if ( i + j > 0 )  this.execMapSignature += ', ' ;
			this.execMapSignature += this.execMapCallbacks[ j ] + 'Callback' ;
		}
	}
	
	this.execMapSignature += ')' ;
	
	return this ;
} ;



async.Plan.prototype.exec = function exec()
{
	var inputs , callbacks = {} , i ;
	
	if ( arguments.length < this.execMapMinArgs )
	{
		throw new Error( "[async] Too few arguments, in this instance, the function signature is: fn" + this.execMapSignature ) ;
	}
	else if ( arguments.length > this.execMapMaxArgs )
	{
		throw new Error( "[async] Too much arguments, in this instance, the function signature is: fn" + this.execMapSignature ) ;
	}
	
	if ( this.execMapMinInputs === this.execMapMaxInputs )
	{
		// Fixed arguments count, variable callback count possible
		inputs = Array.prototype.slice.call( arguments , 0 , this.execMapMaxInputs ) ;
		
		for ( i = 0 ; i < this.execMapCallbacks.length && inputs.length + i < arguments.length ; i ++ )
		{
			callbacks[ this.execMapCallbacks[ i ] ] = arguments[ inputs.length + i ] ;
		}
	}
	else
	{
		// Variable arguments count, fixed callback count
		inputs = Array.prototype.slice.call( arguments , 0 , - this.execMapCallbacks.length ) ;
		
		for ( i = 0 ; i < this.execMapCallbacks.length ; i ++ )
		{
			callbacks[ this.execMapCallbacks[ i ] ] = arguments[ inputs.length + i ] ;
		}
	}
	
	return this.execInit( inputs , callbacks ) ;
} ;



// Export the async.Plan object as an async function, so it can be called later at will
async.Plan.prototype.export = function _export() { return this.clone().exec.bind( this ) ; } ;



// Exec templates
async.Plan.prototype.execArgs = function execArgs()
{
	return this.execInit( arguments , {} ) ;
} ;

async.Plan.prototype.execFinally = function execFinally( finallyCallback )
{
	return this.execInit( [] , { 'finally': finallyCallback } ) ;
} ;

async.Plan.prototype.execThenCatch = function execThenCatch( thenCallback , catchCallback , finallyCallback )
{
	return this.execInit( [] , { 'then': thenCallback , 'catch': catchCallback , 'finally': finallyCallback } ) ;
} ;

async.Plan.prototype.execThenElse = function execThenElse( thenCallback , elseCallback , finallyCallback )
{
	return this.execInit( [] , { 'then': thenCallback , 'else': elseCallback , 'finally': finallyCallback } ) ;
} ;

async.Plan.prototype.execThenElseCatch = function execThenElseCatch( thenCallback , elseCallback , catchCallback , finallyCallback )
{
	return this.execInit( [] , { 'then': thenCallback , 'else': elseCallback , 'catch': catchCallback , 'finally': finallyCallback } ) ;
} ;



// What to do on new loop iteration
async.Plan.prototype.execLoop = function execLoop( fromExecContext ) { return this.execInit( undefined , undefined , fromExecContext ) ; } ;



			//////////////////////////////////////////////////////
			// Async Plan factory: create different Plan object //
			//////////////////////////////////////////////////////



// Create an async.Plan flow, parallel limit is preset to 1 (series) as default, but customizable with parallel()
async.do = function _do( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Create an async parallel flow
async.do.parallel = async.doParallel = function doParallel( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: Infinity , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Create an async series flow
async.do.series = async.doSeries = function doSeries( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: 1 , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Create an async.Plan flow, parallel limit is preset to 1 (series) as default, but customizable with parallel()
async.foreach = function foreach( jobsData , iterator )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		usingIsIterator: { value: true , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	asyncPlan.using( iterator ) ;
	
	return asyncPlan ;
} ;



// Create an async parallel flow, and return the result of the first non-error
async.race = function race( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		race: { value: true , enumerable: true } ,
		parallelLimit: { value: Infinity , writable: true , enumerable: true } ,
		errorsAreFatal: { value: false , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	// We only want the result of the first succeeding job
	asyncPlan.returnLastJobOnly = true ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Create an async series flow, each job transmit its results to the next jobs
async.waterfall = function waterfall( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		waterfall: { value: true , enumerable: true } ,
		waterfallTransmitError: { value: false , writable: true , enumerable: true } ,
		parallelLimit: { value: 1 , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	// We only want the result of the first succeeding job
	asyncPlan.returnLastJobOnly = true ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// async while
// Here, simple callback is mandatory, since it should process its inputs correctly in order to loop or not
async.while = function _while( whileAction )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		waterfall: { value: false , enumerable: true } ,
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		whileAction: { value: undefined , writable: true , enumerable: true } ,
		whileActionBefore: { value: true , writable: false , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.while( whileAction ) ;
	
	return asyncPlan ;
} ;



// Create an async AND
async.and = function and( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		result: { value: undefined , writable: true , enumerable: true } ,
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		elseAction: { value: undefined , writable: true , enumerable: true } ,
		castToBoolean: { value: false , writable: true , enumerable: true } ,
		useLogicAnd: { value: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Create an async OR (it's close to AND)
async.or = function or( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		result: { value: undefined , writable: true , enumerable: true } ,
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		elseAction: { value: undefined , writable: true , enumerable: true } ,
		castToBoolean: { value: false , writable: true , enumerable: true } ,
		useLogicAnd: { value: false } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



// Syntaxic sugar: various if notations
async.if = function _if( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		result: { value: undefined , writable: true , enumerable: true } ,
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		elseAction: { value: true , writable: true , enumerable: true } ,
		castToBoolean: { value: true , writable: true , enumerable: true } ,
		useLogicAnd: { value: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	if ( jobsData )  asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;

async.if.and = async.if ;
async.if.or = function if_or( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		result: { value: undefined , writable: true , enumerable: true } ,
		parallelLimit: { value: 1 , writable: true , enumerable: true } ,
		elseAction: { value: true , writable: true , enumerable: true } ,
		castToBoolean: { value: true , writable: true , enumerable: true } ,
		useLogicAnd: { value: false } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	if ( jobsData )  asyncPlan.do( jobsData ) ;
	
	return asyncPlan ;
} ;



			//////////////////////////////////////////////////
			// Async ExecContext: Context of plan execution //
			//////////////////////////////////////////////////



// Empty constructor, it is just there to support instanceof operator
async.ExecContext = function ExecContext()
{
	throw new Error( "[async] Cannot create an async ExecContext object directly" ) ;
} ;

// Extends it from EventEmitter
async.ExecContext.prototype = Object.create( async.EventEmitter.prototype ) ;
async.ExecContext.prototype.constructor = async.ExecContext ;



function execDoInit( execInputs , execCallbacks , fromExecContext )
{
	// Create instanceof ExecContext
	var execContext = Object.create( async.ExecContext.prototype , {
		execInputs: { value: ( fromExecContext ? fromExecContext.execInputs : execInputs ) , enumerable: true } ,
		execCallbacks: { value: ( fromExecContext ? fromExecContext.execCallbacks : execCallbacks ) } ,
		results: { value: ( Array.isArray( this.jobsData ) ? [] : {} ) , writable: true , enumerable: true } ,
		jobsTimeoutTimers: { value: ( Array.isArray( this.jobsData ) ? [] : {} ) , writable: true } ,
		retriesTimers: { value: ( Array.isArray( this.jobsData ) ? [] : {} ) , writable: true } ,
		retries: { value: ( Array.isArray( this.jobsData ) ? [] : {} ) , writable: true , enumerable: true } ,
		iterator: { value: 0 , writable: true , enumerable: true } ,
		running: { value: 0 , writable: true , enumerable: true } ,
		done: { value: 0 , writable: true , enumerable: true } ,
		remaining: { value: this.jobsKeys.length , writable: true , enumerable: true } ,
		status: { value: undefined , writable: true , enumerable: true } ,
		error: { value: undefined , writable: true , enumerable: true } ,
		statusTriggerJobsKey: { value: undefined , writable: true , enumerable: true } ,
		whileIterator: { value: ( fromExecContext ? fromExecContext.whileIterator + 1 : 0 ) , enumerable: true } ,
		whileStatus: { value: undefined , writable: true } ,
			// true if current execContext has looped in another execContext (one loop per execContext possible)
			// false if this execContext will never loop, undefined if this isn't settled
		whileChecked: { value: false , writable: true }
	} ) ;
	
	// Set the root execContext (the first execContext, in while loop): self or parent.root
	Object.defineProperties( execContext , {
		root: { value: ( fromExecContext ? fromExecContext.root : execContext ) , enumerable: true }
	} ) ;
	
	// Set up the nice value
	execContext.nice( this.asyncEventNice ) ;
	
	
	// Initialize event listeners, only the first time
	if ( fromExecContext === undefined )
	{
		// Register execFinal to the 'ready' event
		execContext.root.on( 'ready' , this.execFinal.bind( this , execContext ) ) ;
		
		
		// Register whileAction to the 'while' event and exec to the 'nextLoop' event
		// Here, simple callback is mandatory
		if ( typeof this.whileAction === 'function' )
		{
			execContext.root.on( 'while' , this.whileAction.bind( this ) ) ;
			execContext.root.on( 'nextLoop' , this.execLoop.bind( this ) ) ;
		}
		else
		{
			this.whileAction = undefined ; // falsy value: do not trigger while code
			execContext.whileStatus = false ; // settle while status to false
		}
		
		
		// Register execNext to the next event
		execContext.root.on( 'next' , this.execNext.bind( this ) ) ;
		
		
		// If we are in a .while().do() scheme, start whileAction before doing anything
		if ( this.whileAction && this.whileActionBefore )
		{
			execContext.whileIterator = -1 ;
			execContext.root.asyncEmit( 'while' , execContext.error , execContext.results , this.execLoopCallback.bind( this , execContext ) ) ;
			return this ;
		}
	}
	
	
	// Run...
	execContext.root.asyncEmit( 'next' , execContext ) ;
	
	// If uncommented, «if» will emit a «progress» event too, which we don't want
	//execContext.root.asyncEmit( 'progress' , { loop: execContext.whileIterator , done: execContext.done , running: execContext.running , remaining: execContext.remaining , status: execContext.status } , execContext.results ) ;
	
	return execContext.root ;
}



// Iterator/next
function execDoNext( execContext ) 
{
	var args , indexOfKey , key , length = this.jobsKeys.length , startIndex , endIndex ;
	
	startIndex = execContext.iterator ;
	
	for ( ; execContext.iterator < length && execContext.running < this.parallelLimit ; execContext.iterator ++ )
	{
		execContext.running ++ ;
		execContext.remaining -- ;
		
		// Current key...
		indexOfKey = execContext.iterator ;
		key = this.jobsKeys[ indexOfKey ] ;
		
		// Set retries[] to 0 for this key
		execContext.retries[ key ] = 0 ;
		
		// This is to make the result's keys in the same order than the jobs's keys
		execContext.results[ key ] = undefined ;
		
		// execJob() later, or synchronous jobs will mess up the current code flow
		
		endIndex = execContext.iterator ;
	}
	
	// Defered execution of jobs
	for ( indexOfKey = startIndex ; indexOfKey <= endIndex ; indexOfKey ++ )
	{
		this.execJob( execContext , this.jobsData[ this.jobsKeys[ indexOfKey ] ] , indexOfKey ) ;
	}
}



// Result callback
function execDoCallback( execContext , indexOfKey , error )
{	
	var self = this , timeout , length = this.jobsKeys.length , key = this.jobsKeys[ indexOfKey ] ;
	
	// Emit() are postponed at the end of the function: we want a consistent flow, wheither we are running sync or async
	var emitNext = false , emitReady = false , emitFinish = false , emitWhile = false ;
	
	
	// Clear timers if needed
	if ( execContext.jobsTimeoutTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.jobsTimeoutTimers[ key ] ) ;
		execContext.jobsTimeoutTimers[ key ] = undefined ;
	}
	
	if ( execContext.retriesTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.retriesTimers[ key ] ) ;
		execContext.retriesTimers[ key ] = undefined ;
	}
	
	
	// Eventually retry on error
	if ( error && this.maxRetry > execContext.retries[ key ] )
	{
		timeout = this.retryTimeout * Math.pow( this.retryMultiply , execContext.retries[ key ] ) ;
		if ( timeout > this.retryMaxTimeout )  timeout = this.retryMaxTimeout ;
		/*
		console.log( "  Retry for key: " , key ) ;
		console.log( "    Multiply: " , this.retryMultiply ) ;
		console.log( "    Retried: " , execContext.retries[ key ] ) ;
		console.log( "    Timeout: " , timeout ) ;
		*/
		execContext.retries[ key ] ++ ;
		execContext.retriesTimers[ key ] = setTimeout( function() {
			//console.log( "    Retry Timeout triggered... for key: " , key ) ;
			execContext.retriesTimers[ key ] = undefined ;
			self.execJob( execContext , self.jobsData[ key ] , indexOfKey ) ;
		} , timeout ) ;
		return ;
	}
	
	
	// The callback has already been called for this job: either a user error or a timeout reach before this job completion
	if ( execContext.results[ key ] !== undefined )  return ;
	
	
	// Update stats & results
	execContext.done ++ ;
	execContext.running -- ;
	execContext.results[ key ] = Array.prototype.slice.call( arguments , 2 ) ;
	
	
	// Check immediate success or failure
	if ( execContext.status === undefined )
	{
		if ( this.race && ! error )
		{
			execContext.status = 'success' ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction )  emitWhile = true ;
			else  emitReady = true ;
		}
		else if ( ! this.race && error && this.errorsAreFatal )
		{
			execContext.status = 'error' ;
			execContext.error = error ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction )  emitWhile = true ;
			else  emitReady = true ;
		}
	}
	
	
	// What to do next?
	if ( execContext.done >= length )
	{
		// We have done everything
		
		if ( execContext.status === undefined )
		{
			// If still no status, fix the status and emit 'ready' and 'finish'
			if ( this.race )  execContext.status = 'error' ;
			else execContext.status = 'success' ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction )  emitWhile = true ;
			else  emitReady = emitFinish = true ;
		}
		else
		{
			// If we are here, whileAction (if any) has already been called
			// So if it is already settled, and false, emit 'finish'
			if ( ! this.whileAction || ( execContext.whileChecked && execContext.whileStatus !== true ) )  emitFinish = true ;
		}
	}
	else if ( execContext.status === undefined )
	{
		// Iterate to the next job if status have not been settled (or settled to error in a non-race mode if errors are not fatal)
		if ( execContext.iterator < length )  emitNext = true ;
	}
	else if ( execContext.running <= 0 )
	{
		// No more item are running, so we can emit 'finish'
		
		// If we are here, whileAction (if any) has already been called
		// So if it is already settled, and false, emit 'finish'
		if ( ! this.whileAction || ( execContext.whileChecked && execContext.whileStatus !== true ) )  emitFinish = true ;
	}
	
	// Emit events, the order matter
	if ( emitReady )  execContext.root.asyncEmit( 'ready' , execContext.error , execContext.results ) ;
	if ( emitNext )  execContext.root.asyncEmit( 'next' , execContext ) ;
	if ( emitWhile )  execContext.root.asyncEmit( 'while' , execContext.error , execContext.results , this.execLoopCallback.bind( this , execContext ) ) ;
	execContext.root.asyncEmit( 'progress' , { loop: execContext.whileIterator , done: execContext.done , running: execContext.running , remaining: execContext.remaining , error: execContext.error } , execContext.results ) ;
	if ( emitFinish )  execContext.root.asyncEmit( 'finish' , execContext.error , execContext.results ) ;
}



function execWhileCallback( execContext )
{
	var result , logic , length = this.jobsKeys.length ;
	
	// Emit() are postponed at the end of the function: we want a consistent flow, wheither we are running sync or async
	var emitNextLoop = false , emitReady = false , emitFinish = false ;
	
	// Arguments checking for fn( [Error] , logic )
	if ( arguments.length <= 1 ) { result = undefined ; logic = false ; }
	else if ( arguments[ 1 ] instanceof Error ) { execContext.error = arguments[ 1 ] ; result = arguments[ 1 ] ; logic = false ; }
	else if ( arguments.length <= 2 ) { result = arguments[ 1 ] ; logic = result ? true : false ; }
	else { result = arguments[ 2 ] ; logic = result ? true : false ; }
	
	/*
	console.log( 'execWhileCallback(), logic: ' + logic + ', result: ' + result ) ;
	console.log( arguments ) ;
	*/
	
	if ( logic )
	{
		execContext.whileStatus = true ;
		emitNextLoop = true ;
	}
	else
	{
		execContext.whileStatus = false ;
		emitReady = true ;
		if ( execContext.running <= 0 )  emitFinish = true ;
	}
	
	// Emit events, the order is important
	if ( emitReady )  execContext.root.asyncEmit( 'ready' , execContext.error , execContext.results ) ;
	if ( emitNextLoop )  execContext.root.asyncEmit( 'nextLoop' , execContext ) ;
	if ( emitFinish )  execContext.root.asyncEmit( 'finish' , execContext.error , execContext.results ) ;
	
	execContext.whileChecked = true ;
}



// What to do when the job is done
function execDoFinal( execContext , error , results )
{
	var toReturn ;
	
	if ( error )
	{
		// Catch...
		if ( this.returnLastJobOnly )  toReturn = results[ execContext.statusTriggerJobsKey ] ;
		else  toReturn = [ error , results ] ;
		
		if ( this.catchAction )  this.execAction( execContext , this.catchAction , toReturn ) ;
		if ( error && execContext.execCallbacks.catch )  this.execAction( execContext , execContext.execCallbacks.catch , toReturn ) ;
	}
	else
	{
		// Then...
		if ( this.returnLastJobOnly )  toReturn = results[ execContext.statusTriggerJobsKey ].slice( 1 ) ;
		else  toReturn = [ results ] ;
		
		if ( this.thenAction )  this.execAction( execContext , this.thenAction , toReturn ) ;
		if ( execContext.execCallbacks.then )  this.execAction( execContext , execContext.execCallbacks.then , toReturn ) ;
	}
	
	// Finally...
	if ( this.returnLastJobOnly )  toReturn = results[ execContext.statusTriggerJobsKey ] ;
	else  toReturn = [ error , results ] ;
	
	if ( this.finallyAction )  this.execAction( execContext , this.finallyAction , toReturn ) ;
	if ( execContext.execCallbacks.finally )  this.execAction( execContext , execContext.execCallbacks.finally , toReturn ) ;
}



// Handle AND & OR
function execLogicCallback( execContext , indexOfKey )
{
	var logic , length = this.jobsKeys.length , key = this.jobsKeys[ indexOfKey ] ;
	
	// Emit() are postponed at the end of the function
	var emitNext = false , emitReady = false , emitFinish = false ;
	
	// Arguments checking for fn( [Error] , logic )
	if ( arguments.length <= 2 ) { this.result = undefined ; logic = false ; }
	else if ( arguments[ 2 ] instanceof Error ) { execContext.error = arguments[ 2 ] ; this.result = arguments[ 2 ] ; logic = false ; }
	else if ( arguments.length <= 3 ) { this.result = arguments[ 2 ] ; logic = this.result ? true : false ; }
	else { this.result = arguments[ 3 ] ; logic = this.result ? true : false ; }
	
	
	// Clear timers if needed
	if ( execContext.jobsTimeoutTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.jobsTimeoutTimers[ key ] ) ;
		execContext.jobsTimeoutTimers[ key ] = undefined ;
	}
	
	/* no retries in logic async ATM
	if ( execContext.retriesTimers[ key ] !== undefined )
	{
		clearTimeout( execContext.retriesTimers[ key ] ) ;
		execContext.retriesTimers[ key ] = undefined ;
	}*/
	
	
	// The callback has already been called for this job: either a user error or a timeout reach before this job completion
	if ( execContext.results[ key ] !== undefined )  return ;
	
	
	// Update stats & results
	execContext.done ++ ;
	execContext.running -- ;
	
	if ( this.castToBoolean && ( ! ( this.result instanceof Error ) || ! this.catchAction ) )  this.result = logic ;
	execContext.results[ key ] = this.result ;
	
	
	// Check immediate success or failure
	if ( logic !== this.useLogicAnd && execContext.status === undefined )
	{
		execContext.status = ! this.useLogicAnd ;
		emitReady = true ;
	}
	
	
	// What to do next?
	if ( execContext.done >= length )
	{
		// We have done everything
		
		if ( execContext.status === undefined )
		{
			execContext.status = this.useLogicAnd ;
			emitReady = true ;
		}
		
		emitFinish = true ;
	}
	else if ( execContext.status === undefined )
	{
		// Iterate to the next job if status have not been settled
		
		if ( execContext.iterator < length )  emitNext =  true ;
	}
	else if ( execContext.running <= 0 )
	{
		// No more item are running, so we can emit 'finish'
		
		emitFinish = true ;
	}
	
	// Emit events, the order matter
	if ( emitReady )  execContext.root.asyncEmit( 'ready' , this.result ) ;
	if ( emitNext )  execContext.root.asyncEmit( 'next' , execContext ) ;
	if ( emitFinish )  execContext.root.asyncEmit( 'finish' , execContext.error , execContext.results ) ;
}



// What to do when the job is done
function execLogicFinal( execContext , result )
{
	// First, the internally registered action
	if ( result instanceof Error )
	{
		if ( this.catchAction )  this.execAction( execContext , this.catchAction , [ result ] ) ;
		else if ( this.elseAction )  this.execAction( execContext , this.elseAction , [ result ] ) ;
	}
	else if ( ! this.result && this.elseAction )  this.execAction( execContext , this.elseAction , [ result ] ) ;
	else if ( this.result && this.thenAction )  this.execAction( execContext , this.thenAction , [ result ] ) ;
	
	if ( this.finallyAction )  this.execAction( execContext , this.finallyAction , [ result ] ) ;
	
	
	// Same things, for execContext callback
	if ( result instanceof Error )
	{
		if ( execContext.execCallbacks.catch )  this.execAction( execContext , execContext.execCallbacks.catch , [ result ] ) ;
		else if ( execContext.execCallbacks.else )  this.execAction( execContext , execContext.execCallbacks.else , [ result ] ) ;
	}
	else if ( ! this.result && execContext.execCallbacks.else )  this.execAction( execContext , execContext.execCallbacks.else , [ result ] ) ;
	else if ( this.result && execContext.execCallbacks.then )  this.execAction( execContext , execContext.execCallbacks.then , [ result ] ) ;
	
	if ( execContext.execCallbacks.finally )  this.execAction( execContext , execContext.execCallbacks.finally , [ result ] ) ;
}



