(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var async = require( './core.js' ) ;
module.exports = async ;

async.wrapper = require( './wrapper.js' ) ;
async.exit = require( './exit.js' ) ;



},{"./core.js":3,"./exit.js":4,"./wrapper.js":5}],2:[function(require,module,exports){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global window */



if ( ! window.setImmediate )
{
	window.setImmediate = function( callback ) { return setTimeout( callback , 0 ) ; } ;
}

// Load async.js, export it, and set isBrowser to true
module.exports = require( './core.js' ) ;
module.exports.wrapper = require( './wrapper.js' ) ;
module.exports.isBrowser = true ;


},{"./core.js":3,"./wrapper.js":5}],3:[function(require,module,exports){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
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
	- caolan/async's: compose(), detect(), filter() ?
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

"use strict" ;



// Load modules dependencies
var NextGenEvents = require( 'nextgen-events' ) ;
var treeExtend = require( 'tree-kit/lib/extend.js' ) ;



var async = {} ;
module.exports = async ;





			//////////////////////////
			// Internal Async Error //
			//////////////////////////



// Extend Error
async.AsyncError = function AsyncError( message )
{
	Error.call( this ) ;
	Error.captureStackTrace && Error.captureStackTrace( this , this.constructor ) ;
	this.message = message ;
} ;

async.AsyncError.prototype = Object.create( Error.prototype ) ;
async.AsyncError.prototype.constructor = async.AsyncError ;



			//////////////////////////////////////////////////////
			// Async Plan factory: create different Plan object //
			//////////////////////////////////////////////////////



// Empty constructor, it is just there to support instanceof operator
async.Plan = function Plan()
{
	throw new Error( "[async] Cannot create an async Plan object directly" ) ;
} ;

//async.Plan.prototype = Object.create( NextGenEvents.prototype ) ;
async.Plan.prototype.constructor = async.Plan ;



// Common properties for all instance of async.Plan
var planCommonProperties = {
	// Configurable
	parallelLimit: { value: 1 , writable: true , enumerable: true , configurable: true } ,
	raceMode: { value: false , writable: true , enumerable: true , configurable: true } ,
	waterfallMode: { value: false , writable: true , enumerable: true , configurable: true } ,
	waterfallTransmitError: { value: false , writable: true , enumerable: true , configurable: true } ,
	whileAction: { value: undefined , writable: true , enumerable: true , configurable: true } ,
	whileActionBefore: { value: false , writable: true , enumerable: true , configurable: true } ,
	errorsAreFatal: { value: true , writable: true , enumerable: true , configurable: true } ,
	returnMapping1to1: { value: false , writable: true , enumerable: true , configurable: true } ,
	
	// Not configurable
	jobsData: { value: {} , writable: true , enumerable: true } ,
	jobsKeys: { value: [] , writable: true , enumerable: true } ,
	jobsUsing: { value: undefined , writable: true , enumerable: true } ,
	jobsTimeout: { value: undefined , writable: true , enumerable: true } ,
	returnLastJobOnly: { value: false , writable: true , enumerable: true } ,
	defaultAggregate: { value: undefined , writable: true , enumerable: true } ,
	returnAggregate: { value: false , writable: true , enumerable: true } ,
	transmitAggregate: { value: false , writable: true , enumerable: true } ,
	usingIsIterator: { value: false , writable: true , enumerable: true } ,
	thenAction: { value: undefined , writable: true , enumerable: true } ,
	catchAction: { value: undefined , writable: true , enumerable: true } ,
	finallyAction: { value: undefined , writable: true , enumerable: true } ,
	asyncEventNice: { value: -20 , writable: true , enumerable: true } ,
	maxRetry: { value: 0 , writable: true , enumerable: true } ,
	retryTimeout: { value: 0 , writable: true , enumerable: true } ,
	retryMultiply: { value: 1 , writable: true , enumerable: true } ,
	retryMaxTimeout: { value: Infinity , writable: true , enumerable: true } ,
	execMappingMinInputs: { value: 0 , writable: true , enumerable: true } ,
	execMappingMaxInputs: { value: 100 , writable: true , enumerable: true } ,
	execMappingCallbacks: { value: [ 'finally' ] , writable: true , enumerable: true } ,
	execMappingAggregateArg: { value: false , writable: true , enumerable: true } ,
	execMappingMinArgs: { value: 0 , writable: true , enumerable: true } ,
	execMappingMaxArgs: { value: 101 , writable: true , enumerable: true } ,
	execMappingSignature: { value: '( [finallyCallback] )' , writable: true , enumerable: true } ,
	locked: { value: false , writable: true , enumerable: true }
} ;



// Create an async.Plan flow, parallel limit is preset to 1 (series) as default, but customizable with .parallel()
async.do = function _do( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
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
async.parallel = function parallel( jobsData )
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
async.series = function series( jobsData )
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



// Create an async parallel flow, and return the result of the first non-error
async.race = function race( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		raceMode: { value: true , enumerable: true } ,
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
		waterfallMode: { value: true , enumerable: true } ,
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



// Create an async foreach, parallel limit is preset to 1 (series) as default, but customizable with .parallel()
async.foreach = async.forEach = function foreach( jobsData , iterator )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		usingIsIterator: { value: true , writable: true , enumerable: true } ,
		errorsAreFatal: { value: false , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	asyncPlan.iterator( iterator ) ;
	
	return asyncPlan ;
} ;



// Create an async map, parallel limit is preset to Infinity, but customizable with .parallel()
async.map = function map( jobsData , iterator )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: Infinity , writable: true , enumerable: true } ,
		usingIsIterator: { value: true , writable: true , enumerable: true } ,
		errorsAreFatal: { value: false , writable: true , enumerable: true } ,
		// the result mapping should match the jobs' data 1:1
		returnMapping1to1: { value: true , writable: false , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	asyncPlan.do( jobsData ) ;
	asyncPlan.iterator( iterator ) ;
	
	return asyncPlan ;
} ;



// Create an async reduce, force parallel limit to 1 (does it make sense to do it in parallel?)
async.reduce = function reduce( jobsData , defaultAggregate , iterator )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		parallelLimit: { value: 1 , writable: false , enumerable: true } ,
		usingIsIterator: { value: true , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	if ( arguments.length < 3 )
	{
		// No defaultAggregate given
		iterator = defaultAggregate ;
		defaultAggregate = undefined ;
		
		// Force exec signature to have an aggregateArg
		asyncPlan.execMappingMinInputs = 0 ;
		asyncPlan.execMappingMaxInputs = 100 ;
		asyncPlan.execMappingCallbacks = [ 'finally' ] ;
		asyncPlan.execMappingAggregateArg = true ;
		asyncPlan.execMappingMinArgs = 1 ;
		asyncPlan.execMappingMaxArgs = 102 ;
		asyncPlan.execMappingSignature = '( aggregateArg, [finallyCallback] )' ;
	}
	
	asyncPlan.transmitAggregate = true ;
	asyncPlan.returnAggregate = true ;
	asyncPlan.defaultAggregate = defaultAggregate ;
	
	asyncPlan.do( jobsData ) ;
	asyncPlan.iterator( iterator ) ;
	
	return asyncPlan ;
} ;



// async while
// Here, simple callback is mandatory, since it should process its inputs correctly in order to loop or not
async.while = function _while( whileAction )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		waterfallMode: { value: false , enumerable: true } ,
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
		elseAction: { value: true , writable: true , enumerable: true } ,
		castToBoolean: { value: true , writable: true , enumerable: true } ,
		useLogicAnd: { value: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	if ( jobsData ) { asyncPlan.do( jobsData ) ; }
	
	return asyncPlan ;
} ;

async.if.and = async.if ;
async.if.or = function ifOr( jobsData )
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		elseAction: { value: true , writable: true , enumerable: true } ,
		castToBoolean: { value: true , writable: true , enumerable: true } ,
		useLogicAnd: { value: false } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execLogicCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execLogicFinal.bind( asyncPlan ) }
	} ) ;
	
	if ( jobsData ) { asyncPlan.do( jobsData ) ; }
	
	return asyncPlan ;
} ;



			////////////////
			// Shorthands //
			////////////////



// Accept only one function, timeout it
// async.timeout( fn , timeout , [maxRetry] , [retryTimeout] , [multiply] , [maxRetryTimeout] )
//async.timeout = function timeout( func , timeoutValue , maxRetry , retryTimeout , multiply , maxRetryTimeout )
async.callTimeout = function callTimeout( timeout , completionCallback , fn , this_ )
{
	if ( typeof fn !== 'function' ) { throw new Error( '[async] async.callTimeout(): argument #0 should be a function' ) ; }
	
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	
	Object.defineProperties( asyncPlan , {
		returnLastJobOnly: { value: true , enumerable: true } ,
		jobsTimeout: { value: timeout , writable: true , enumerable: true } ,
		execInit: { value: execDoInit.bind( asyncPlan ) } ,
		execNext: { value: execDoNext.bind( asyncPlan ) } ,
		execCallback: { value: execDoCallback } ,
		execLoopCallback: { value: execWhileCallback } ,
		execFinal: { value: execDoFinal.bind( asyncPlan ) }
	} ) ;
	
	var job = [ fn.bind( this_ ) ].concat( Array.prototype.slice.call( arguments , 4 ) ) ;
	asyncPlan.do( [ job ] ) ;
	
	//if ( arguments.length > 2 ) { asyncPlan.retry( maxRetry , retryTimeout , multiply , maxRetryTimeout ) ; }
	
	return asyncPlan.exec( completionCallback ) ;
} ;



			///////////////////////
			// Async Plan object //
			///////////////////////



// Set the job's list
async.Plan.prototype.do = function _do( jobsData )
{
	if ( this.locked ) { return this ; }
	
	if ( jobsData && typeof jobsData === 'object' ) { this.jobsData = jobsData ; }
	else if ( typeof jobsData === 'function' )  { this.jobsData = [ jobsData ] ; this.returnLastJobOnly = true ; }
	else { this.jobsData = {} ; }
	
	this.jobsKeys = Object.keys( this.jobsData ) ;
	
	return this ;
} ;



// Set number of jobs running in parallel
async.Plan.prototype.parallel = function parallel( parallelLimit )
{
	if ( this.locked ) { return this ; }
	
	if ( parallelLimit === undefined || parallelLimit === true ) { this.parallelLimit = Infinity ; }
	else if ( parallelLimit === false ) { this.parallelLimit = 1 ; }
	else if ( typeof parallelLimit === 'number' ) { this.parallelLimit = parallelLimit ; }
	
	return this ;
} ;



// Set race mode: we stop processing jobs when the first non-error job finish.
// Notice: when using race() this way (without the async.race() factory), you have to call .fatal( false ) too if you want the same behaviour.
async.Plan.prototype.race = function race( raceMode )
{
	if ( ! this.locked ) { this.raceMode = raceMode || raceMode === undefined ? true : false ; }
	return this ;
} ;



// Set waterfall mode: each job pass its results to the next job.
// Be careful, this does not support parallel mode ATM, but may fail silently.
// TODO: should probably raise an exception if we use parallel mode.
async.Plan.prototype.waterfall = function waterfall( waterfallMode )
{
	if ( ! this.locked ) { this.waterfallMode = waterfallMode || waterfallMode === undefined ? true : false ; }
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
	if ( whileActionBefore !== undefined ) { this.whileActionBefore = whileActionBefore ? true : false ; }
	return this ;
} ;



// Set the number of time to repeat the action.
// It is the same as while(), provided with a simple counter function.
async.Plan.prototype.repeat = function repeat( n )
{
	if ( this.locked ) { return this ; }
	
	var i = 0 ;
	
	if ( typeof n !== 'number' ) { n = parseInt( n ) ; }
	this.whileActionBefore = true ;
	
	this.whileAction = function( error , results , callback ) {
		// callback should be called last, to avoid sync vs async mess, hence i++ come first, and we check i<=n rather than i<n
		i ++ ;
		callback( i <= n ) ;
	} ;
	
	return this ;
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
	if ( ! this.locked )
	{
		if ( typeof jobsTimeout === 'number' ) { this.jobsTimeout = jobsTimeout ; }
		else { this.jobsTimeout = undefined ; }
	}
	return this ;
} ;



// Set how to retry jobs in error
async.Plan.prototype.retry = function retry( maxRetry , timeout , multiply , maxTimeout )
{
	if ( this.locked ) { return this ; }
	
	if ( typeof maxRetry === 'number' ) { this.maxRetry = maxRetry ; }
	if ( typeof timeout === 'number' ) { this.retryTimeout = timeout ; }
	if ( typeof multiply === 'number' ) { this.retryMultiply = multiply ; }
	if ( typeof maxTimeout === 'number' ) { this.retryMaxTimeout = maxTimeout ; }
	
	return this ;
} ;



// Set if only the last job's results should be passed to the callback
async.Plan.prototype.lastJobOnly = function lastJobOnly( returnLastJobOnly )
{
	if ( ! this.locked ) { this.returnLastJobOnly = returnLastJobOnly || returnLastJobOnly === undefined ? true : false ; }
	return this ;
} ;



// Set if the result mapping should match the jobs' data 1:1
async.Plan.prototype.mapping1to1 = function mapping1to1( returnMapping1to1 )
{
	if ( ! this.locked ) { this.returnMapping1to1 = returnMapping1to1 || returnMapping1to1 === undefined ? true : false ; }
	return this ;
} ;



// Set the performer of the jobs: if set, do() is not feeded by callback but by arguments for this single callback function.
// The performer function should accept a callback as its last argument, in the nodejs' way.
async.Plan.prototype.using = function using( jobsUsing )
{
	if ( ! this.locked ) { this.jobsUsing = jobsUsing ; }
	return this ;
} ;



// Same as using(), but the given function receive an uniq "element" containing the whole job as its first argument:
// it is like using().usingIterator(), a behaviour similar to the async.foreach() factory
async.Plan.prototype.iterator = function iterator( iterator_ )
{
	if ( this.locked ) { return this ; }
	this.jobsUsing = iterator_ ;
	this.usingIsIterator = true ;
	return this ;
} ;



// Transmit aggregate, for aggregator mode (reduce, etc)
async.Plan.prototype.aggregator = function aggregator( transmitAggregate , returnAggregate , defaultAggregate )
{
	if ( ! this.locked )  { return this ; }
	this.transmitAggregate = transmitAggregate || transmitAggregate === undefined ? true : false ;
	this.returnAggregate = returnAggregate || returnAggregate === undefined ? true : false ;
	if ( arguments.length > 2 )  { this.defaultAggregate = defaultAggregate ; }
	return this ;
} ;



// Set if using() is an iterator (like async.foreach()), if so, the whole job is transmitted as one argument rather than an argument list
// NODOC
async.Plan.prototype.usingIterator = function usingIterator( usingIsIterator )
{
	if ( ! this.locked )  { this.usingIsIterator = usingIsIterator || usingIsIterator === undefined ? true : false ; }
	return this ;
} ;



// Set the async'ness of the flow, even sync jobs can be turned async
async.Plan.prototype.nice = function nice( asyncEventNice )
{
	if ( this.locked ) { return this ; }
	
	if ( asyncEventNice === undefined || asyncEventNice === null || asyncEventNice === true ) { this.asyncEventNice = -1 ; }
	else if ( asyncEventNice === false ) { this.asyncEventNice = -20 ; }
	else { this.asyncEventNice = asyncEventNice ; }
	
	return this ;
} ;



// Set action to do on completion.
// If catch() or else() are present and match, then() is not triggered.
async.Plan.prototype.then = function then( thenAction )
{
	if ( ! this.locked ) { this.thenAction = thenAction ; }
	return this ;
} ;



// Set action to do on logical false status
async.Plan.prototype.else = function _else( elseAction )
{
	if ( ! this.locked ) { this.elseAction = elseAction || true ; }
	return this ;
} ;



// Set action to do on error
async.Plan.prototype.catch = function _catch( catchAction )
{
	if ( ! this.locked ) { this.catchAction = catchAction || true ; }
	return this ;
} ;



// Set action to do, that trigger whether it has triggered or not any of then()/catch()/else()
async.Plan.prototype.finally = function _finally( finallyAction )
{
	if ( ! this.locked ) { this.finallyAction = finallyAction || true ; }
	return this ;
} ;



// Return a clone of the object
async.Plan.prototype.clone = function clone()
{
	var asyncPlan = Object.create( async.Plan.prototype , planCommonProperties ) ;
	treeExtend( null , asyncPlan , this ) ;
	asyncPlan.locked = false ;
	return asyncPlan ;
} ;



// Export the async.Plan object as an async function, so it can be called later at will
async.Plan.prototype.export = function _export( execMethod )
{
	switch ( execMethod )
	{
		case 'execFinally' :
			return this.clone().execFinally.bind( this ) ;
		case 'execThenCatch' :
			return this.clone().execThenCatch.bind( this ) ;
		case 'execThenElse' :
			return this.clone().execThenElse.bind( this ) ;
		case 'execThenElseCatch' :
			return this.clone().execThenElseCatch.bind( this ) ;
		case 'execArgs' :
			return this.clone().execArgs.bind( this ) ;
		case 'execKV' :
			return this.clone().execKV.bind( this ) ;
		default :
			return this.clone().exec.bind( this ) ;
	}
} ;



// This is the common exec() function, its arguments can be mapped using execMapping()
async.Plan.prototype.exec = function exec()
{
	var config = { inputs: [] , callbacks: {} } , offset = 0 , i ;
	
	if ( arguments.length < this.execMappingMinArgs )
	{
		throw new Error( "[async] Too few arguments, in this instance, the function signature is: fn" + this.execMappingSignature ) ;
	}
	else if ( arguments.length > this.execMappingMaxArgs )
	{
		throw new Error( "[async] Too much arguments, in this instance, the function signature is: fn" + this.execMappingSignature ) ;
	}
	
	if ( this.execMappingAggregateArg )
	{
		offset ++ ;
		config.aggregate = arguments[ 0 ] ;
	}
	
	if ( this.execMappingMinInputs === this.execMappingMaxInputs )
	{
		// Fixed arguments count, variable callback count possible
		config.inputs = Array.prototype.slice.call( arguments , offset , this.execMappingMaxInputs + offset ) ;
		
		for ( i = 0 ; i < this.execMappingCallbacks.length && config.inputs.length + i < arguments.length ; i ++ )
		{
			config.callbacks[ this.execMappingCallbacks[ i ] ] = arguments[ config.inputs.length + offset + i ] ;
		}
	}
	else
	{
		// Variable arguments count, fixed callback count
		config.inputs = Array.prototype.slice.call( arguments , offset , - this.execMappingCallbacks.length ) ;
		
		for ( i = 0 ; i < this.execMappingCallbacks.length ; i ++ )
		{
			config.callbacks[ this.execMappingCallbacks[ i ] ] = arguments[ config.inputs.length + offset + i ] ;
		}
	}
	
	return this.execInit( config ) ;
} ;



// Exec templates
async.Plan.prototype.execFinally = function execFinally( finallyCallback )
{
	return this.execInit( { inputs: [] , callbacks: { 'finally': finallyCallback } } ) ;
} ;



async.Plan.prototype.execThenCatch = function execThenCatch( thenCallback , catchCallback , finallyCallback )
{
	return this.execInit( { inputs: [] , callbacks: { 'then': thenCallback , 'catch': catchCallback , 'finally': finallyCallback } } ) ;
} ;



async.Plan.prototype.execThenElse = function execThenElse( thenCallback , elseCallback , finallyCallback )
{
	return this.execInit( { inputs: [] , callbacks: { 'then': thenCallback , 'else': elseCallback , 'finally': finallyCallback } } ) ;
} ;



async.Plan.prototype.execThenElseCatch = function execThenElseCatch( thenCallback , elseCallback , catchCallback , finallyCallback )
{
	return this.execInit( { inputs: [] , callbacks: { 'then': thenCallback , 'else': elseCallback , 'catch': catchCallback , 'finally': finallyCallback } } ) ;
} ;



async.Plan.prototype.execArgs = function execArgs()
{
	return this.execInit( { inputs: arguments , callbacks: {} } ) ;
} ;



// Configure the inputs of exec() function
// .callbacks
// .minInputs
// .maxInputs
// .inputsName
// .aggregateArg
async.Plan.prototype.execMapping = function execMapping( config )
{
	if ( this.locked )  { return this ; }
	
	config = treeExtend( null , { minInputs: 0 , maxInputs: 0 } , config ) ;
	
	var i , j , maxUnnamed = 5 ;
	
	config.minInputs = parseInt( config.minInputs ) ;
	config.maxInputs = parseInt( config.maxInputs ) ;
	
	if ( config.minInputs < config.maxInputs )
	{
		this.execMappingMinInputs = config.minInputs ;
		this.execMappingMaxInputs = config.maxInputs ;
	}
	else
	{
		// User is stOopid, swap...
		this.execMappingMinInputs = config.maxInputs ;
		this.execMappingMaxInputs = config.minInputs ;
	}
	
	this.execMappingCallbacks = Array.isArray( config.callbacks ) ? config.callbacks : [] ;
	this.execMappingInputsName = Array.isArray( config.inputsName ) ? config.inputsName : [] ;
	this.execMappingSignature = '( ' ;
	
	if ( this.execMappingMinInputs === this.execMappingMaxInputs )
	{
		// Fixed input count, variable callback count possible
		this.execMappingMinArgs = this.execMappingMinInputs ;
		this.execMappingMaxArgs = this.execMappingMaxInputs + this.execMappingCallbacks.length ;
		
		if ( config.aggregateArg )
		{
			this.execMappingAggregateArg = config.aggregateArg ;
			this.execMappingMinArgs ++ ;
			this.execMappingMaxArgs ++ ;
			this.execMappingSignature += 'aggregateValue' ;
		}
		
		for ( i = 0 ; i < this.execMappingMaxInputs ; i ++ )
		{
			if ( i > 0 || config.aggregateArg )  { this.execMappingSignature += ', ' ; }
			if ( i >= maxUnnamed && typeof this.execMappingInputsName[ i ] !== 'string' )  { this.execMappingSignature += '... ' ; break ; }
			
			this.execMappingSignature += typeof this.execMappingInputsName[ i ] === 'string' ? this.execMappingInputsName[ i ] : 'arg#' + ( i + 1 ) ;
		}
		
		for ( j = 0 ; j < this.execMappingCallbacks.length ; j ++ )
		{
			if ( i + j > 0 || config.aggregateArg )  { this.execMappingSignature += ', ' ; }
			this.execMappingSignature += '[' + this.execMappingCallbacks[ j ] + 'Callback]' ;
		}
	}
	else
	{
		// Variable input count, fixed callback count
		this.execMappingMinArgs = this.execMappingMinInputs + this.execMappingCallbacks.length ;
		this.execMappingMaxArgs = this.execMappingMaxInputs + this.execMappingCallbacks.length ;
		
		if ( config.aggregateArg )
		{
			this.execMappingAggregateArg = config.aggregateArg ;
			this.execMappingMinArgs ++ ;
			this.execMappingMaxArgs ++ ;
			this.execMappingSignature += 'aggregateValue' ;
		}
		
		for ( i = 0 ; i < this.execMappingMaxInputs ; i ++ )
		{
			if ( i > 0 || config.aggregateArg )  { this.execMappingSignature += ', ' ; }
			
			if ( i < this.execMappingMinInputs )
			{
				if ( i >= maxUnnamed && typeof this.execMappingInputsName[ i ] !== 'string' )  { this.execMappingSignature += '... ' ; break ; }
				this.execMappingSignature += typeof this.execMappingInputsName[ i ] === 'string' ? this.execMappingInputsName[ i ] : 'arg#' + ( i + 1 ) ;
			}
			else
			{
				if ( i >= maxUnnamed && typeof this.execMappingInputsName[ i ] !== 'string' )  { this.execMappingSignature += '[...] ' ; break ; }
				this.execMappingSignature += '[' + ( typeof this.execMappingInputsName[ i ] === 'string' ? this.execMappingInputsName[ i ] : 'arg#' + ( i + 1 ) ) + ']' ;
			}
		}
		
		for ( j = 0 ; j < this.execMappingCallbacks.length ; j ++ )
		{
			if ( i + j > 0 || config.aggregateArg )  { this.execMappingSignature += ', ' ; }
			this.execMappingSignature += this.execMappingCallbacks[ j ] + 'Callback' ;
		}
	}
	
	this.execMappingSignature += ' )' ;
	
	return this ;
} ;



// More sage and deterministic exec(), with all arguments given into a single object
async.Plan.prototype.execKV = function execKV( config )
{
	if ( config.inputs === undefined )  { config.inputs = [] ; }
	else if ( ! Array.isArray( config.inputs ) )  { config.inputs = [ config.inputs ] ; }
	
	if ( config.callbacks === undefined || typeof config.callbacks !== 'object' )  { config.callbacks = {} ; }
	if ( config.then )  { config.callbacks.then = config.then ; }
	if ( config.else )  { config.callbacks.else = config.else ; }
	if ( config.catch )  { config.callbacks.catch = config.catch ; }
	if ( config.finally )  { config.callbacks.finally = config.finally ; }
	
	// Nothing to do here, user is free to pass whatever is needed
	//if ( config.aggregate === undefined )  { config.aggregate = null ; }
	
	return this.execInit( config ) ;
} ;



// Internal, what to do on new loop iteration
async.Plan.prototype.execLoop = function execLoop( fromExecContext ) { return this.execInit( {} , fromExecContext ) ; } ;



// Internal exec of callback-like job/action
async.Plan.prototype.execJob = function execJob( execContext , job , indexOfKey , tryIndex )
{
	var self = this , args , key = execContext.jobsKeys[ indexOfKey ] ;
	
	// Create the job's context
	var jobContext = Object.create( async.JobContext.prototype , {
		execContext: { value: execContext , enumerable: true } ,
		indexOfKey: { value: indexOfKey , enumerable: true } ,
		tryIndex: { value: tryIndex , enumerable: true } ,
		aborted: { value: false , writable: true , enumerable: true } ,
		abortedLoop: { value: false , writable: true , enumerable: true }
	} ) ;
	
	// Add the callback to the context
	Object.defineProperty( jobContext , 'callback' , {
		value: this.execCallback.bind( this , jobContext ) ,
		enumerable: true
	} ) ;
	
	// Also add the jobContext into the bounded function: it's an alternate way to access a job's context.
	Object.defineProperty( jobContext.callback , 'jobContext' , {
		value: jobContext ,
		enumerable: true
	} ) ;
	
	
	// Set the current job's status to 'pending'
	execContext.jobsStatus[ key ].status = 'pending' ;
	execContext.jobsStatus[ key ].tried ++ ;
	
	// Set up the nice value? For instance only syncEmit() are used
	//jobContext.setNice( this.asyncEventNice ) ;
	
	
	if ( typeof this.jobsUsing === 'function' )
	{
		if ( this.usingIsIterator )
		{
			if ( this.transmitAggregate )
			{
				if ( this.jobsUsing.length <= 3 )
				{
					this.jobsUsing.call( jobContext , execContext.aggregate , job , jobContext.callback ) ;
				}
				else if ( this.jobsUsing.length <= 4 )
				{
					this.jobsUsing.call( jobContext , execContext.aggregate , job , Array.isArray( execContext.jobsData ) ? indexOfKey : key , jobContext.callback ) ;
				}
				else
				{
					this.jobsUsing.call( jobContext , execContext.aggregate , job , Array.isArray( execContext.jobsData ) ? indexOfKey : key , execContext.jobsData , jobContext.callback ) ;
				}
			}
			else
			{
				if ( this.jobsUsing.length <= 2 )
				{
					this.jobsUsing.call( jobContext , job , jobContext.callback ) ;
				}
				else if ( this.jobsUsing.length <= 3 )
				{
					this.jobsUsing.call( jobContext , job , Array.isArray( execContext.jobsData ) ? indexOfKey : key , jobContext.callback ) ;
				}
				else
				{
					this.jobsUsing.call( jobContext , job , Array.isArray( execContext.jobsData ) ? indexOfKey : key , execContext.jobsData , jobContext.callback ) ;
				}
			}
		}
		else if ( Array.isArray( job ) )
		{
			args = job.slice() ;
			
			if ( this.transmitAggregate )  { args.unshift( execContext.aggregate ) ; }
			
			args.push( jobContext.callback ) ;
			this.jobsUsing.apply( jobContext , args ) ;
		}
		else
		{
			this.jobsUsing.call( jobContext , job , jobContext.callback ) ;
		}
	}
	else if ( typeof job === 'function' )
	{
		if ( this.waterfallMode && indexOfKey > 0 )
		{
			// remove the first, error arg if waterfallTransmitError is false
			//console.log( index , key , execContext.results ) ;
			args = execContext.results[ execContext.jobsKeys[ indexOfKey - 1 ] ].slice( this.waterfallTransmitError ? 0 : 1 ) ;
			args.push( jobContext.callback ) ;
			job.apply( jobContext , args ) ;
		}
		else if ( Array.isArray( this.jobsUsing ) || this.execMappingMaxInputs )
		{
			if ( Array.isArray( this.jobsUsing ) ) { args = treeExtend( null , [] , this.jobsUsing , execContext.execInputs ) ; }
			else { args = treeExtend( null , [] , execContext.execInputs ) ; }
			
			args.push( jobContext.callback ) ;
			job.apply( jobContext , args ) ;
		}
		else
		{
			job.call( jobContext , jobContext.callback ) ;
		}
	}
	else if ( Array.isArray( job ) && typeof job[ 0 ] === 'function' )
	{
		args = job.slice( 1 ) ;
		args.push( jobContext.callback ) ;
		job[ 0 ].apply( jobContext , args ) ;
	}
	else if ( typeof job === 'object' && job instanceof async.Plan )
	{
		// What to do with jobUsing and execContext.execInputs here? Same as if( typeof job === 'function' ) ?
		job.exec( jobContext.callback ) ;
	}
	else
	{
		this.execCallback.call( this , jobContext ) ;
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
			execContext.jobsTimeoutTimers[ key ] = undefined ;
			execContext.jobsStatus[ key ].status = 'timeout' ;
			jobContext.emit( 'timeout' ) ;
			self.execCallback.call( self , jobContext , new async.AsyncError( 'jobTimeout' ) ) ;
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



			/////////////////////////////////////////////////////////////////////////
			// Async JobContext: Context of a job execution, transmitted as *this* //
			/////////////////////////////////////////////////////////////////////////



// Empty constructor, it is just there to support instanceof operator
async.JobContext = function JobContext()
{
	throw new Error( "[async] Cannot create an async JobContext object directly" ) ;
} ;

// Extends it from EventEmitter
async.JobContext.prototype = Object.create( NextGenEvents.prototype ) ;
async.JobContext.prototype.constructor = async.JobContext ;



// Permit a userland-side abort of the job's queue
async.JobContext.prototype.abort = function abort()
{
	this.aborted = true ;
	this.callback.apply( undefined , arguments ) ;
} ;



// Permit a userland-side abort of the job's queue, and event the whole loop
async.JobContext.prototype.abortLoop = function abortLoop()
{
	this.aborted = true ;
	this.abortedLoop = true ;
	this.callback.apply( undefined , arguments ) ;
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
async.ExecContext.prototype = Object.create( NextGenEvents.prototype ) ;
async.ExecContext.prototype.constructor = async.ExecContext ;



// This is used to complete jobsStatus only on-demand, so big data that are not object (e.g. big string)
// does not get duplicated for nothing
async.ExecContext.prototype.getJobsStatus = function getJobsStatus()
{
	var i , key , fullJobsStatus = Array.isArray( this.jobsData ) ? [] : {} ;
	
	for ( i = 0 ; i < this.jobsKeys.length ; i ++ )
	{
		key = this.jobsKeys[ i ] ;
		
		fullJobsStatus[ key ] = treeExtend( null , {
				job: this.jobsData[ key ] ,
				result: this.results[ key ]
			} ,
			this.jobsStatus[ key ]
		) ;
	}
	
	return fullJobsStatus ;
} ;



function execDoInit( config , fromExecContext )
{
	var i , isArray = Array.isArray( this.jobsData ) ;
	
	// Create instanceof ExecContext
	var execContext = Object.create( async.ExecContext.prototype , {
		plan: { value: this } ,
		aggregate: { value: ( 'aggregate' in config  ? config.aggregate : this.defaultAggregate ) , writable: true , enumerable: true } ,
		results: { value: ( isArray ? [] : {} ) , writable: true , enumerable: true } ,
		result: { value: undefined , writable: true , enumerable: true } , // Conditionnal version
		jobsTimeoutTimers: { value: ( isArray ? [] : {} ) , writable: true } ,
		jobsStatus: { value: ( isArray ? [] : {} ) , writable: true , enumerable: true } ,
		retriesTimers: { value: ( isArray ? [] : {} ) , writable: true } ,
		retriesCounter: { value: ( isArray ? [] : {} ) , writable: true , enumerable: true } ,
		tryUserResponseCounter: { value: ( isArray ? [] : {} ) , writable: true , enumerable: true } ,
		tryResponseCounter: { value: ( isArray ? [] : {} ) , writable: true , enumerable: true } ,
		iterator: { value: 0 , writable: true , enumerable: true } ,
		pending: { value: 0 , writable: true , enumerable: true } ,
		resolved: { value: 0 , writable: true , enumerable: true } ,
		ok: { value: 0 , writable: true , enumerable: true } ,
		failed: { value: 0 , writable: true , enumerable: true } ,
		status: { value: undefined , writable: true , enumerable: true } ,
		error: { value: undefined , writable: true , enumerable: true } ,
		statusTriggerJobsKey: { value: undefined , writable: true , enumerable: true } ,
		whileStatus: { value: undefined , writable: true } ,
			// true if current execContext has looped in another execContext (one loop per execContext possible)
			// false if this execContext will never loop, undefined if this isn't settled
		whileChecked: { value: false , writable: true }
	} ) ;
	
	// Add some properties depending on inherited ExecContext or not
	if ( ! fromExecContext )
	{
		// This is the top-level/first ExecContext
		Object.defineProperties( execContext , {
			root: { value: execContext , enumerable: true } ,
			jobsData: {
				value: ( isArray ? this.jobsData.slice(0) : treeExtend( null , {} , this.jobsData ) ) ,
				enumerable: true
			} ,
			jobsKeys: { value: this.jobsKeys.slice(0) , enumerable: true } ,
			execInputs: { value: config.inputs , enumerable: true } ,
			execCallbacks: { value: config.callbacks } ,
			whileIterator: { value: 0 , enumerable: true , writable: true }
		} ) ;
	}
	else
	{
		// This is a loop, and this ExecContext is derived from the first one
		Object.defineProperties( execContext , {
			root: { value: fromExecContext.root , enumerable: true } ,
			jobsData: { value: fromExecContext.jobsData , enumerable: true } ,
			jobsKeys: { value: fromExecContext.jobsKeys , enumerable: true } ,
			execInputs: { value: fromExecContext.execInputs , enumerable: true } ,
			execCallbacks: { value: fromExecContext.execCallbacks } ,
			whileIterator: { value: fromExecContext.whileIterator + 1 , enumerable: true , writable: true }
		} ) ;
	}
	
	// Add more properties depending on previous properties
	Object.defineProperties( execContext , {
		waiting: { value: execContext.jobsKeys.length , writable: true , enumerable: true }
	} ) ;
	
	// Init the jobsStatus
	for ( i = 0 ; i < execContext.jobsKeys.length ; i ++ )
	{
		execContext.jobsStatus[ execContext.jobsKeys[ i ] ] = {
			status: 'waiting' ,
			errors: [] ,
			tried: 0
		} ;
	}
	
	// Set up the nice value
	execContext.setNice( this.asyncEventNice ) ;
	
	
	// Initialize event listeners, only the first time
	if ( fromExecContext === undefined )
	{
		// Register execFinal to the 'resolved' event
		execContext.root.on( 'resolved' , this.execFinal.bind( this , execContext ) ) ;
		
		
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
		
		
		// If we are in a async.while().do() scheme, start whileAction before doing anything
		if ( this.whileAction && this.whileActionBefore )
		{
			execContext.whileIterator = -1 ;
			execContext.root.emit( 'while' , execContext.error , execContext.results , this.execLoopCallback.bind( this , execContext ) , null ) ;
			return this ;
		}
	}
	
	// If no jobs are provided, then exit right now
	if ( execContext.jobsKeys.length <= 0 )
	{
		execContext.root.emit( 'resolved' , execContext.error , execContext.results ) ;
		execContext.root.emit( 'progress' , {
				resolved: execContext.resolved ,
				ok: execContext.ok ,
				failed: execContext.failed ,
				pending: execContext.pending ,
				waiting: execContext.waiting ,
				loop: execContext.whileIterator
			} ,
			execContext.error , execContext.results
		) ;
		execContext.root.emit( 'finish' , execContext.error , execContext.results ) ;
		return execContext.root ;
	}
	
	// Run...
	execContext.root.emit( 'next' , execContext ) ;
	
	// If uncommented, «if» will emit a «progress» event too, which we don't want
	//execContext.root.emit( 'progress' , { resolved: execContext.resolved , pending: execContext.pending , waiting: execContext.waiting , loop: execContext.whileIterator } , execContext.results ) ;
	
	return execContext.root ;
}



// Iterator/next
function execDoNext( execContext )
{
	var indexOfKey , key , length = execContext.jobsKeys.length , startIndex , endIndex ;
	
	startIndex = execContext.iterator ;
	
	for ( ; execContext.iterator < length && execContext.pending < this.parallelLimit ; execContext.iterator ++ )
	{
		execContext.pending ++ ;
		execContext.waiting -- ;
		
		// Current key...
		indexOfKey = execContext.iterator ;
		key = execContext.jobsKeys[ indexOfKey ] ;
		
		// Set retriesCounter[] to 0 for this key
		execContext.retriesCounter[ key ] = 0 ;
		
		// Create the retries array for this key
		execContext.tryResponseCounter[ key ] = [] ;
		execContext.tryResponseCounter[ key ][ 0 ] = 0 ;
		execContext.tryUserResponseCounter[ key ] = [] ;
		execContext.tryUserResponseCounter[ key ][ 0 ] = 0 ;
		
		// This is to make the result's keys in the same order than the jobs's keys
		execContext.results[ key ] = undefined ;
		
		// execJob() later, or synchronous jobs will mess up the current code flow
		
		endIndex = execContext.iterator ;
	}
	
	// Defered execution of jobs
	for ( indexOfKey = startIndex ; indexOfKey <= endIndex ; indexOfKey ++ )
	{
		this.execJob( execContext , execContext.jobsData[ execContext.jobsKeys[ indexOfKey ] ] , indexOfKey , 0 ) ;
	}
}



// Result callback
function execDoCallback( jobContext , error )
{
	var execContext = jobContext.execContext ,
		aborted = jobContext.aborted ,
		abortedLoop = jobContext.abortedLoop ,
		indexOfKey = jobContext.indexOfKey ,
		tryIndex = jobContext.tryIndex ;
	
	var self = this , timeout , nextTryIndex , length = execContext.jobsKeys.length , key = execContext.jobsKeys[ indexOfKey ] ;
	
	// Emit() are postponed at the end of the function: we want a consistent flow, wheither we are running sync or async
	var emitNext = false , emitResolved = false , emitFinish = false , emitWhile = false ;
	
	// Increment the current tryResponseCounter and tryUserResponseCounter
	execContext.tryResponseCounter[ key ][ tryIndex ] ++ ;
	if ( ! ( error instanceof async.AsyncError ) ) { execContext.tryUserResponseCounter[ key ][ tryIndex ] ++ ; }
	
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
	
	
	/*
	console.log( "\n  key: " , key ) ;
	console.log( "    retriesCounter: " , execContext.retriesCounter[ key ] , "/" , this.maxRetry ) ;
	console.log( "    tryIndex: " , tryIndex ) ;
	console.log( "    tryResponseCounter: " , execContext.tryResponseCounter[ key ][ tryIndex ] ) ;
	console.log( "    tryUserResponseCounter: " , execContext.tryUserResponseCounter[ key ][ tryIndex ] ) ;
	//*/
	
	//console.log( "    --> No result yet" ) ;
	
	// User code shouldn't call the callback more than once... even abort() is cancelled here
	if ( execContext.tryUserResponseCounter[ key ][ tryIndex ] > 1 )
	{
		execContext.jobsStatus[ key ].errors.push( new Error( 'This job has called its completion callback ' + execContext.tryUserResponseCounter[ key ][ tryIndex ] + ' times' ) ) ;
		return ;
	}
	
	// The callback has already been called for this job: either a user error or a timeout reach there before this job completion
	// Not sure if this case still exists
	if ( ! aborted && execContext.results[ key ] !== undefined )
	{
		return ;
	}
	//console.log( "    --> First user's response" ) ;
	
	// Eventually retry on error, if we can retry this job and if this try has not triggered another retry yet
	if ( ! aborted && error && this.maxRetry > execContext.retriesCounter[ key ] && execContext.tryResponseCounter[ key ][ tryIndex ] <= 1 )
	{
		// First "log" the error in the jobsStatus
		execContext.jobsStatus[ key ].errors.push( error ) ;
		
		timeout = this.retryTimeout * Math.pow( this.retryMultiply , execContext.retriesCounter[ key ] ) ;
		if ( timeout > this.retryMaxTimeout ) { timeout = this.retryMaxTimeout ; }
		
		/*
		console.log( "\n    Retry for key: " , key ) ;
		console.log( "      retryMultiply: " , this.retryMultiply ) ;
		console.log( "      retriesCounter: " , execContext.retriesCounter[ key ] ) ;
		console.log( "      timeout: " , timeout ) ;
		//*/
		
		execContext.retriesCounter[ key ] ++ ;
		nextTryIndex = execContext.retriesCounter[ key ] ;
		//console.log( "      nextTryIndex: " , nextTryIndex ) ;
		
		execContext.retriesTimers[ key ] = setTimeout( function() {
			//console.log( "    Retry Timeout triggered... for key: " , key ) ;
			execContext.retriesTimers[ key ] = undefined ;
			execContext.tryResponseCounter[ key ][ nextTryIndex ] = 0 ;
			execContext.tryUserResponseCounter[ key ][ nextTryIndex ] = 0 ;
			self.execJob( execContext , execContext.jobsData[ key ] , indexOfKey , nextTryIndex ) ;
		} , timeout ) ;
		
		return ;
	}
	//console.log( "    --> Don't have to retry" ) ;
	
	// If it is an error and posterior tries are in progress
	if ( ! aborted && error && tryIndex < execContext.retriesCounter[ key ] ) { return ; }
	//console.log( "    --> Can proceed results" ) ;
	
	
	// Update stats & results
	execContext.resolved ++ ;
	execContext.pending -- ;
	execContext.aggregate = arguments[ 2 ] ;
	
	if ( aborted )
	{
		execContext.failed ++ ;
		execContext.jobsStatus[ key ].status = 'aborted' ;
	}
	else if ( error )
	{
		execContext.failed ++ ;
		execContext.jobsStatus[ key ].errors.push( error ) ;
		if ( error instanceof async.AsyncError && error.message === 'jobTimeout' ) { execContext.jobsStatus[ key ].status = 'timeout' ; }
		else { execContext.jobsStatus[ key ].status = 'failed' ; }
	}
	else
	{
		execContext.ok ++ ;
		execContext.jobsStatus[ key ].status = 'ok' ;
	}
	
	if ( this.returnMapping1to1 )  { execContext.results[ key ] = arguments[ 2 ] ; }
	else  { execContext.results[ key ] = Array.prototype.slice.call( arguments , 1 ) ; }
	
	
	// Check immediate success or failure
	if ( execContext.status === undefined )
	{
		if ( this.raceMode && ! error )
		{
			execContext.status = 'ok' ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction && ! abortedLoop ) { emitWhile = true ; }
			else { emitResolved = true ; }
		}
		else if ( ! this.raceMode && error && this.errorsAreFatal )
		{
			execContext.status = 'fail' ;
			execContext.error = error ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction && ! abortedLoop ) { emitWhile = true ; }
			else { emitResolved = true ; }
		}
		else if ( aborted )
		{
			execContext.status = 'aborted' ;
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction && ! abortedLoop ) { emitWhile = true ; }
			else { emitResolved = true ; }
		}
	}
	
	
	// What to do next?
	if ( execContext.resolved >= length )
	{
		// We have resolved everything
		
		if ( execContext.status === undefined )
		{
			// If still no status, fix the status and emit 'resolved' and 'finish'
			if ( this.raceMode ) { execContext.status = 'fail' ; }
			else { execContext.status = 'ok' ; }
			execContext.statusTriggerJobsKey = key ;
			
			if ( this.whileAction ) { emitWhile = true ; }
			else { emitResolved = emitFinish = true ; }
		}
		else
		{
			// If we are here, whileAction (if any) has already been called
			// So if it is already settled, and false, emit 'finish'
			if ( ! this.whileAction || ( execContext.whileChecked && execContext.whileStatus !== true ) ) { emitFinish = true ; }
		}
	}
	else if ( execContext.status === undefined )
	{
		// Iterate to the next job if status have not been settled (or settled to error in a non-race mode if errors are not fatal)
		if ( execContext.iterator < length ) { emitNext = true ; }
	}
	else if ( execContext.pending <= 0 )
	{
		// No more item are pending, so we can emit 'finish'
		
		// If we are here, whileAction (if any) has already been called
		// So if it is already settled, and false, emit 'finish'
		if ( ! this.whileAction || ( execContext.whileChecked && execContext.whileStatus !== true ) ) { emitFinish = true ; }
	}
	
	// Emit events, the order matter
	if ( emitResolved ) { execContext.root.emit( 'resolved' , execContext.error , execContext.results ) ; }
	if ( emitNext ) { execContext.root.emit( 'next' , execContext ) ; }
	if ( emitWhile ) { execContext.root.emit( 'while' , execContext.error , execContext.results , this.execLoopCallback.bind( this , execContext ) , null ) ; }
	execContext.root.emit( 'progress' , {
			resolved: execContext.resolved ,
			ok: execContext.ok ,
			failed: execContext.failed ,
			pending: execContext.pending ,
			waiting: execContext.waiting ,
			loop: execContext.whileIterator
		} ,
		execContext.error , execContext.results
	) ;
	if ( emitFinish ) { execContext.root.emit( 'finish' , execContext.error , execContext.results ) ; }
}



function execWhileCallback( execContext )
{
	var result , logic ;
	
	// Emit() are postponed at the end of the function: we want a consistent flow, wheither we are running sync or async
	var emitNextLoop = false , emitResolved = false , emitFinish = false ;
	
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
		emitResolved = true ;
		if ( execContext.pending <= 0 ) { emitFinish = true ; }
	}
	
	// Emit events, the order is important
	if ( emitResolved ) { execContext.root.emit( 'resolved' , execContext.error , execContext.results ) ; }
	if ( emitNextLoop ) { execContext.root.emit( 'nextLoop' , execContext ) ; }
	if ( emitFinish ) { execContext.root.emit( 'finish' , execContext.error , execContext.results ) ; }
	
	execContext.whileChecked = true ;
}



// What to do when the job is resolved
function execDoFinal( execContext , error , results )
{
	var toReturn ;
	
	if ( error )
	{
		// Catch...
		// Should catch() get all the results?
		if ( this.returnAggregate )  { toReturn = [ error , execContext.aggregate ] ; }
		else if ( this.returnLastJobOnly )  { toReturn = results[ execContext.statusTriggerJobsKey ] ; }
		else  { toReturn = [ error , results ] ; }
		
		if ( this.catchAction )  { this.execAction( execContext , this.catchAction , toReturn ) ; }
		if ( error && execContext.execCallbacks.catch )  { this.execAction( execContext , execContext.execCallbacks.catch , toReturn ) ; }
	}
	else
	{
		// Then...
		if ( this.returnAggregate )  { toReturn = [ execContext.aggregate ] ; }
		else if ( this.returnLastJobOnly )  { toReturn = results[ execContext.statusTriggerJobsKey ].slice( 1 ) ; }
		else  { toReturn = [ results ] ; }
		
		if ( this.thenAction )  { this.execAction( execContext , this.thenAction , toReturn ) ; }
		if ( execContext.execCallbacks.then )  { this.execAction( execContext , execContext.execCallbacks.then , toReturn ) ; }
	}
	
	// Finally...
	if ( this.returnAggregate )  { toReturn = [ error , execContext.aggregate ] ; }
	else if ( this.returnLastJobOnly )  { toReturn = results[ execContext.statusTriggerJobsKey ] ; }
	else  { toReturn = [ error , results ] ; }
	
	if ( this.finallyAction )  { this.execAction( execContext , this.finallyAction , toReturn ) ; }
	if ( execContext.execCallbacks.finally )  { this.execAction( execContext , execContext.execCallbacks.finally , toReturn ) ; }
}



// Handle AND & OR
function execLogicCallback( jobContext )
{
	var execContext = jobContext.execContext ,
		indexOfKey = jobContext.indexOfKey ,
		tryIndex = jobContext.tryIndex ;
	
	var self = this , logic , timeout , nextTryIndex , error ,
		length = execContext.jobsKeys.length , key = execContext.jobsKeys[ indexOfKey ] ;
	
	// Emit() are postponed at the end of the function
	var emitNext = false , emitResolved = false , emitFinish = false ;
	
	// Arguments checking for fn( [Error] , logic )
	if ( arguments.length <= 1 ) { execContext.result = undefined ; logic = false ; }
	else if ( arguments[ 1 ] instanceof Error ) { execContext.error = error = arguments[ 1 ] ; execContext.result = arguments[ 1 ] ; logic = false ; }
	else if ( arguments.length <= 2 ) { execContext.result = arguments[ 1 ] ; logic = execContext.result ? true : false ; }
	else { execContext.result = arguments[ 2 ] ; logic = execContext.result ? true : false ; }
	
	
	
	// Increment the current tryResponseCounter and tryUserResponseCounter
	execContext.tryResponseCounter[ key ][ tryIndex ] ++ ;
	if ( ! ( error instanceof async.AsyncError ) ) { execContext.tryUserResponseCounter[ key ][ tryIndex ] ++ ; }
	
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
	
	
	/*
	console.log( "\n  key: " , key ) ;
	console.log( "    retriesCounter: " , execContext.retriesCounter[ key ] , "/" , this.maxRetry ) ;
	console.log( "    tryIndex: " , tryIndex ) ;
	console.log( "    tryResponseCounter: " , execContext.tryResponseCounter[ key ][ tryIndex ] ) ;
	console.log( "    tryUserResponseCounter: " , execContext.tryUserResponseCounter[ key ][ tryIndex ] ) ;
	//*/
	
	// The callback has already been called for this job: either a user error or a timeout reach there before this job completion
	if ( execContext.results[ key ] !== undefined ) { return ; }
	//console.log( "    --> No result yet" ) ;
	
	// User code shouldn't call the callback more than once
	if ( execContext.tryUserResponseCounter[ key ][ tryIndex ] > 1 ) { return ; }
	//console.log( "    --> First user's response" ) ;
	
	// Eventually retry on error, if we can retry this job and if this try has not triggered another retry yet
	if ( error && this.maxRetry > execContext.retriesCounter[ key ] && execContext.tryResponseCounter[ key ][ tryIndex ] <= 1 )
	{
		timeout = this.retryTimeout * Math.pow( this.retryMultiply , execContext.retriesCounter[ key ] ) ;
		if ( timeout > this.retryMaxTimeout ) { timeout = this.retryMaxTimeout ; }
		
		/*
		console.log( "\n    Retry for key: " , key ) ;
		console.log( "      retryMultiply: " , this.retryMultiply ) ;
		console.log( "      retriesCounter: " , execContext.retriesCounter[ key ] ) ;
		console.log( "      timeout: " , timeout ) ;
		//*/
		
		execContext.retriesCounter[ key ] ++ ;
		nextTryIndex = execContext.retriesCounter[ key ] ;
		//console.log( "      nextTryIndex: " , nextTryIndex ) ;
		
		execContext.retriesTimers[ key ] = setTimeout( function() {
			//console.log( "    Retry Timeout triggered... for key: " , key ) ;
			execContext.retriesTimers[ key ] = undefined ;
			execContext.tryResponseCounter[ key ][ nextTryIndex ] = 0 ;
			execContext.tryUserResponseCounter[ key ][ nextTryIndex ] = 0 ;
			self.execJob( execContext , execContext.jobsData[ key ] , indexOfKey , nextTryIndex ) ;
		} , timeout ) ;
		
		return ;
	}
	//console.log( "    --> Don't have to retry" ) ;
	
	// If it is an error and posterior tries are in progress
	if ( error && tryIndex < execContext.retriesCounter[ key ] ) { return ; }
	//console.log( "    --> Can proceed results" ) ;
	
	
	// Update stats & results
	execContext.resolved ++ ;
	execContext.pending -- ;
	
	if ( error )
	{
		execContext.failed ++ ;
		if ( error instanceof async.AsyncError && error.message === 'jobTimeout' ) { execContext.jobsStatus[ key ].status = 'timeout' ; }
		else { execContext.jobsStatus[ key ].status = 'failed' ; }
	}
	else
	{
		execContext.ok ++ ;
		execContext.jobsStatus[ key ].status = 'ok' ;
	}
	
	if ( this.castToBoolean && ( ! ( execContext.result instanceof Error ) || ! this.catchAction ) ) { execContext.result = logic ; }
	execContext.results[ key ] = execContext.result ;
	
	
	// Check immediate success or failure
	if ( logic !== this.useLogicAnd && execContext.status === undefined )
	{
		execContext.status = ! this.useLogicAnd ;
		emitResolved = true ;
	}
	
	
	// What to do next?
	if ( execContext.resolved >= length )
	{
		// We have resolved everything
		
		if ( execContext.status === undefined )
		{
			execContext.status = this.useLogicAnd ;
			emitResolved = true ;
		}
		
		emitFinish = true ;
	}
	else if ( execContext.status === undefined )
	{
		// Iterate to the next job if status have not been settled
		
		if ( execContext.iterator < length ) { emitNext =  true ; }
	}
	else if ( execContext.pending <= 0 )
	{
		// No more item are pending, so we can emit 'finish'
		
		emitFinish = true ;
	}
	
	// Emit events, the order matter
	if ( emitResolved ) { execContext.root.emit( 'resolved' , execContext.result ) ; }
	if ( emitNext ) { execContext.root.emit( 'next' , execContext ) ; }
	execContext.root.emit( 'progress' , { resolved: execContext.resolved , pending: execContext.pending , waiting: execContext.waiting , loop: execContext.whileIterator } , execContext.result ) ;
	if ( emitFinish ) { execContext.root.emit( 'finish' , execContext.result ) ; }
}



// What to do when the job is resolved
function execLogicFinal( execContext , result )
{
	// First, the internally registered action
	if ( result instanceof Error )
	{
		if ( this.catchAction ) { this.execAction( execContext , this.catchAction , [ result ] ) ; }
		else if ( this.elseAction ) { this.execAction( execContext , this.elseAction , [ result ] ) ; }
	}
	else if ( ! execContext.result && this.elseAction ) { this.execAction( execContext , this.elseAction , [ result ] ) ; }
	else if ( execContext.result && this.thenAction ) { this.execAction( execContext , this.thenAction , [ result ] ) ; }
	
	if ( this.finallyAction ) { this.execAction( execContext , this.finallyAction , [ result ] ) ; }
	
	
	// Same things, for execContext callback
	if ( result instanceof Error )
	{
		if ( execContext.execCallbacks.catch ) { this.execAction( execContext , execContext.execCallbacks.catch , [ result ] ) ; }
		else if ( execContext.execCallbacks.else ) { this.execAction( execContext , execContext.execCallbacks.else , [ result ] ) ; }
	}
	else if ( ! execContext.result && execContext.execCallbacks.else ) { this.execAction( execContext , execContext.execCallbacks.else , [ result ] ) ; }
	else if ( execContext.result && execContext.execCallbacks.then ) { this.execAction( execContext , execContext.execCallbacks.then , [ result ] ) ; }
	
	if ( execContext.execCallbacks.finally ) { this.execAction( execContext , execContext.execCallbacks.finally , [ result ] ) ; }
}




},{"nextgen-events":7,"tree-kit/lib/extend.js":8}],4:[function(require,module,exports){
(function (process){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var async = require( './async.js' ) ;



var exitInProgress = false ;



/*
	Asynchronously exit.
	
	Wait for all listeners of the 'asyncExit' event (on the 'process' object) to have called their callback.
	The listeners receive the exit code about to be produced and a completion callback.
*/

function exit( code , timeout )
{
	// Already exiting? no need to call it twice!
	if ( exitInProgress ) { return ; }
	
	exitInProgress = true ;
	
	var listeners = process.listeners( 'asyncExit' ) ;
	
	if ( ! listeners.length ) { process.exit( code ) ; return ; }
	
	if ( timeout === undefined ) { timeout = 1000 ; }
	
	async.parallel( listeners )
	.using( function( listener , usingCallback ) {
		
		if ( listener.length < 3 )
		{
			// This listener does not have a callback, it is interested in the event but does not need to perform critical stuff.
			// E.g. a server will not accept connection or data anymore, but doesn't need cleanup.
			listener( code , timeout ) ;
			usingCallback() ;
		}
		else
		{
			// This listener have a callback, it probably has critical stuff to perform before exiting.
			// E.g. a server that needs to gracefully exit will not accept connection or data anymore,
			// but still want to deliver request in progress.
			listener( code , timeout , usingCallback ) ;
		}
	} )
	.fatal( false )
	.timeout( timeout )
	.exec( function() {
		// We don't care about errors here... We are exiting!
		process.exit( code ) ;
	} ) ;
}

module.exports = exit ;


}).call(this,require('_process'))
},{"./async.js":1,"_process":14}],5:[function(require,module,exports){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var wrapper = {} ;
module.exports = wrapper ;


// Maybe I should have a look to the 'wrappy' package from npm

wrapper.timeout = function timeout( fn , timeout_ , fnThis )
{
	var fnWrapper = function() {
		
		var this_ = fnThis || this ,
			alreadyCalledBack = false ,
			args = Array.prototype.slice.call( arguments ) ,
			callback = args.pop() ;
		
		var callbackWrapper = function() {
			
			if ( alreadyCalledBack ) { return ; }
			
			alreadyCalledBack = true ;
			callback.apply( this_ , arguments ) ;
		} ;
		
		args.push( callbackWrapper ) ;
		fn.apply( this_ , args ) ;
		
		setTimeout( callbackWrapper.bind( undefined , new Error( 'Timeout' ) ) , timeout_ ) ;
	} ;
	
	// Should we copy own properties of fn into fnWrapper?
	
	return fnWrapper ;
} ;



},{}],6:[function(require,module,exports){
(function (Buffer){
(function (global, module) {

  var exports = module.exports;

  /**
   * Exports.
   */

  module.exports = expect;
  expect.Assertion = Assertion;

  /**
   * Exports version.
   */

  expect.version = '0.3.1';

  /**
   * Possible assertion flags.
   */

  var flags = {
      not: ['to', 'be', 'have', 'include', 'only']
    , to: ['be', 'have', 'include', 'only', 'not']
    , only: ['have']
    , have: ['own']
    , be: ['an']
  };

  function expect (obj) {
    return new Assertion(obj);
  }

  /**
   * Constructor
   *
   * @api private
   */

  function Assertion (obj, flag, parent) {
    this.obj = obj;
    this.flags = {};

    if (undefined != parent) {
      this.flags[flag] = true;

      for (var i in parent.flags) {
        if (parent.flags.hasOwnProperty(i)) {
          this.flags[i] = true;
        }
      }
    }

    var $flags = flag ? flags[flag] : keys(flags)
      , self = this;

    if ($flags) {
      for (var i = 0, l = $flags.length; i < l; i++) {
        // avoid recursion
        if (this.flags[$flags[i]]) continue;

        var name = $flags[i]
          , assertion = new Assertion(this.obj, name, this)

        if ('function' == typeof Assertion.prototype[name]) {
          // clone the function, make sure we dont touch the prot reference
          var old = this[name];
          this[name] = function () {
            return old.apply(self, arguments);
          };

          for (var fn in Assertion.prototype) {
            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
              this[name][fn] = bind(assertion[fn], assertion);
            }
          }
        } else {
          this[name] = assertion;
        }
      }
    }
  }

  /**
   * Performs an assertion
   *
   * @api private
   */

  Assertion.prototype.assert = function (truth, msg, error, expected) {
    var msg = this.flags.not ? error : msg
      , ok = this.flags.not ? !truth : truth
      , err;

    if (!ok) {
      err = new Error(msg.call(this));
      if (arguments.length > 3) {
        err.actual = this.obj;
        err.expected = expected;
        err.showDiff = true;
      }
      throw err;
    }

    this.and = new Assertion(this.obj);
  };

  /**
   * Check if the value is truthy
   *
   * @api public
   */

  Assertion.prototype.ok = function () {
    this.assert(
        !!this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to be truthy' }
      , function(){ return 'expected ' + i(this.obj) + ' to be falsy' });
  };

  /**
   * Creates an anonymous function which calls fn with arguments.
   *
   * @api public
   */

  Assertion.prototype.withArgs = function() {
    expect(this.obj).to.be.a('function');
    var fn = this.obj;
    var args = Array.prototype.slice.call(arguments);
    return expect(function() { fn.apply(null, args); });
  };

  /**
   * Assert that the function throws.
   *
   * @param {Function|RegExp} callback, or regexp to match error string against
   * @api public
   */

  Assertion.prototype.throwError =
  Assertion.prototype.throwException = function (fn) {
    expect(this.obj).to.be.a('function');

    var thrown = false
      , not = this.flags.not;

    try {
      this.obj();
    } catch (e) {
      if (isRegExp(fn)) {
        var subject = 'string' == typeof e ? e : e.message;
        if (not) {
          expect(subject).to.not.match(fn);
        } else {
          expect(subject).to.match(fn);
        }
      } else if ('function' == typeof fn) {
        fn(e);
      }
      thrown = true;
    }

    if (isRegExp(fn) && not) {
      // in the presence of a matcher, ensure the `not` only applies to
      // the matching.
      this.flags.not = false;
    }

    var name = this.obj.name || 'fn';
    this.assert(
        thrown
      , function(){ return 'expected ' + name + ' to throw an exception' }
      , function(){ return 'expected ' + name + ' not to throw an exception' });
  };

  /**
   * Checks if the array is empty.
   *
   * @api public
   */

  Assertion.prototype.empty = function () {
    var expectation;

    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
      if ('number' == typeof this.obj.length) {
        expectation = !this.obj.length;
      } else {
        expectation = !keys(this.obj).length;
      }
    } else {
      if ('string' != typeof this.obj) {
        expect(this.obj).to.be.an('object');
      }

      expect(this.obj).to.have.property('length');
      expectation = !this.obj.length;
    }

    this.assert(
        expectation
      , function(){ return 'expected ' + i(this.obj) + ' to be empty' }
      , function(){ return 'expected ' + i(this.obj) + ' to not be empty' });
    return this;
  };

  /**
   * Checks if the obj exactly equals another.
   *
   * @api public
   */

  Assertion.prototype.be =
  Assertion.prototype.equal = function (obj) {
    this.assert(
        obj === this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to not equal ' + i(obj) });
    return this;
  };

  /**
   * Checks if the obj sortof equals another.
   *
   * @api public
   */

  Assertion.prototype.eql = function (obj) {
    this.assert(
        expect.eql(this.obj, obj)
      , function(){ return 'expected ' + i(this.obj) + ' to sort of equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to sort of not equal ' + i(obj) }
      , obj);
    return this;
  };

  /**
   * Assert within start to finish (inclusive).
   *
   * @param {Number} start
   * @param {Number} finish
   * @api public
   */

  Assertion.prototype.within = function (start, finish) {
    var range = start + '..' + finish;
    this.assert(
        this.obj >= start && this.obj <= finish
      , function(){ return 'expected ' + i(this.obj) + ' to be within ' + range }
      , function(){ return 'expected ' + i(this.obj) + ' to not be within ' + range });
    return this;
  };

  /**
   * Assert typeof / instance of
   *
   * @api public
   */

  Assertion.prototype.a =
  Assertion.prototype.an = function (type) {
    if ('string' == typeof type) {
      // proper english in error msg
      var n = /^[aeiou]/.test(type) ? 'n' : '';

      // typeof with support for 'array'
      this.assert(
          'array' == type ? isArray(this.obj) :
            'regexp' == type ? isRegExp(this.obj) :
              'object' == type
                ? 'object' == typeof this.obj && null !== this.obj
                : type == typeof this.obj
        , function(){ return 'expected ' + i(this.obj) + ' to be a' + n + ' ' + type }
        , function(){ return 'expected ' + i(this.obj) + ' not to be a' + n + ' ' + type });
    } else {
      // instanceof
      var name = type.name || 'supplied constructor';
      this.assert(
          this.obj instanceof type
        , function(){ return 'expected ' + i(this.obj) + ' to be an instance of ' + name }
        , function(){ return 'expected ' + i(this.obj) + ' not to be an instance of ' + name });
    }

    return this;
  };

  /**
   * Assert numeric value above _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.greaterThan =
  Assertion.prototype.above = function (n) {
    this.assert(
        this.obj > n
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n });
    return this;
  };

  /**
   * Assert numeric value below _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.lessThan =
  Assertion.prototype.below = function (n) {
    this.assert(
        this.obj < n
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n });
    return this;
  };

  /**
   * Assert string value matches _regexp_.
   *
   * @param {RegExp} regexp
   * @api public
   */

  Assertion.prototype.match = function (regexp) {
    this.assert(
        regexp.exec(this.obj)
      , function(){ return 'expected ' + i(this.obj) + ' to match ' + regexp }
      , function(){ return 'expected ' + i(this.obj) + ' not to match ' + regexp });
    return this;
  };

  /**
   * Assert property "length" exists and has value of _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.length = function (n) {
    expect(this.obj).to.have.property('length');
    var len = this.obj.length;
    this.assert(
        n == len
      , function(){ return 'expected ' + i(this.obj) + ' to have a length of ' + n + ' but got ' + len }
      , function(){ return 'expected ' + i(this.obj) + ' to not have a length of ' + len });
    return this;
  };

  /**
   * Assert property _name_ exists, with optional _val_.
   *
   * @param {String} name
   * @param {Mixed} val
   * @api public
   */

  Assertion.prototype.property = function (name, val) {
    if (this.flags.own) {
      this.assert(
          Object.prototype.hasOwnProperty.call(this.obj, name)
        , function(){ return 'expected ' + i(this.obj) + ' to have own property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have own property ' + i(name) });
      return this;
    }

    if (this.flags.not && undefined !== val) {
      if (undefined === this.obj[name]) {
        throw new Error(i(this.obj) + ' has no property ' + i(name));
      }
    } else {
      var hasProp;
      try {
        hasProp = name in this.obj
      } catch (e) {
        hasProp = undefined !== this.obj[name]
      }

      this.assert(
          hasProp
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name) });
    }

    if (undefined !== val) {
      this.assert(
          val === this.obj[name]
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name)
          + ' of ' + i(val) + ', but got ' + i(this.obj[name]) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name)
          + ' of ' + i(val) });
    }

    this.obj = this.obj[name];
    return this;
  };

  /**
   * Assert that the array contains _obj_ or string contains _obj_.
   *
   * @param {Mixed} obj|string
   * @api public
   */

  Assertion.prototype.string =
  Assertion.prototype.contain = function (obj) {
    if ('string' == typeof this.obj) {
      this.assert(
          ~this.obj.indexOf(obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    } else {
      this.assert(
          ~indexOf(this.obj, obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    }
    return this;
  };

  /**
   * Assert exact keys or inclusion of keys by using
   * the `.own` modifier.
   *
   * @param {Array|String ...} keys
   * @api public
   */

  Assertion.prototype.key =
  Assertion.prototype.keys = function ($keys) {
    var str
      , ok = true;

    $keys = isArray($keys)
      ? $keys
      : Array.prototype.slice.call(arguments);

    if (!$keys.length) throw new Error('keys required');

    var actual = keys(this.obj)
      , len = $keys.length;

    // Inclusion
    ok = every($keys, function (key) {
      return ~indexOf(actual, key);
    });

    // Strict
    if (!this.flags.not && this.flags.only) {
      ok = ok && $keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      $keys = map($keys, function (key) {
        return i(key);
      });
      var last = $keys.pop();
      str = $keys.join(', ') + ', and ' + last;
    } else {
      str = i($keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (!this.flags.only ? 'include ' : 'only have ') + str;

    // Assertion
    this.assert(
        ok
      , function(){ return 'expected ' + i(this.obj) + ' to ' + str }
      , function(){ return 'expected ' + i(this.obj) + ' to not ' + str });

    return this;
  };

  /**
   * Assert a failure.
   *
   * @param {String ...} custom message
   * @api public
   */
  Assertion.prototype.fail = function (msg) {
    var error = function() { return msg || "explicit failure"; }
    this.assert(false, error, error);
    return this;
  };

  /**
   * Function bind implementation.
   */

  function bind (fn, scope) {
    return function () {
      return fn.apply(scope, arguments);
    }
  }

  /**
   * Array every compatibility
   *
   * @see bit.ly/5Fq1N2
   * @api public
   */

  function every (arr, fn, thisObj) {
    var scope = thisObj || global;
    for (var i = 0, j = arr.length; i < j; ++i) {
      if (!fn.call(scope, arr[i], i, arr)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  function indexOf (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    if (arr.length === undefined) {
      return -1;
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0
        ; i < j && arr[i] !== o; i++);

    return j <= i ? -1 : i;
  }

  // https://gist.github.com/1044128/
  var getOuterHTML = function(element) {
    if ('outerHTML' in element) return element.outerHTML;
    var ns = "http://www.w3.org/1999/xhtml";
    var container = document.createElementNS(ns, '_');
    var xmlSerializer = new XMLSerializer();
    var html;
    if (document.xmlVersion) {
      return xmlSerializer.serializeToString(element);
    } else {
      container.appendChild(element.cloneNode(false));
      html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
      container.innerHTML = '';
      return html;
    }
  };

  // Returns true if object is a DOM element.
  var isDOMElement = function (object) {
    if (typeof HTMLElement === 'object') {
      return object instanceof HTMLElement;
    } else {
      return object &&
        typeof object === 'object' &&
        object.nodeType === 1 &&
        typeof object.nodeName === 'string';
    }
  };

  /**
   * Inspects an object.
   *
   * @see taken from node.js `util` module (copyright Joyent, MIT license)
   * @api private
   */

  function i (obj, showHidden, depth) {
    var seen = [];

    function stylize (str) {
      return str;
    }

    function format (value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' &&
          // Filter out the util module, it's inspect function is special
          value !== exports &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        return value.inspect(recurseTimes);
      }

      // Primitive types cannot have properties
      switch (typeof value) {
        case 'undefined':
          return stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + json.stringify(value).replace(/^"|"$/g, '')
                                                   .replace(/'/g, "\\'")
                                                   .replace(/\\"/g, '"') + '\'';
          return stylize(simple, 'string');

        case 'number':
          return stylize('' + value, 'number');

        case 'boolean':
          return stylize('' + value, 'boolean');
      }
      // For some reason typeof null is "object", so special case here.
      if (value === null) {
        return stylize('null', 'null');
      }

      if (isDOMElement(value)) {
        return getOuterHTML(value);
      }

      // Look up the keys of the object.
      var visible_keys = keys(value);
      var $keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

      // Functions without properties can be shortcutted.
      if (typeof value === 'function' && $keys.length === 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          var name = value.name ? ': ' + value.name : '';
          return stylize('[Function' + name + ']', 'special');
        }
      }

      // Dates without properties can be shortcutted
      if (isDate(value) && $keys.length === 0) {
        return stylize(value.toUTCString(), 'date');
      }
      
      // Error objects can be shortcutted
      if (value instanceof Error) {
        return stylize("["+value.toString()+"]", 'Error');
      }

      var base, type, braces;
      // Determine the object type
      if (isArray(value)) {
        type = 'Array';
        braces = ['[', ']'];
      } else {
        type = 'Object';
        braces = ['{', '}'];
      }

      // Make functions say that they are functions
      if (typeof value === 'function') {
        var n = value.name ? ': ' + value.name : '';
        base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
      } else {
        base = '';
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + value.toUTCString();
      }

      if ($keys.length === 0) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          return stylize('[Object]', 'special');
        }
      }

      seen.push(value);

      var output = map($keys, function (key) {
        var name, str;
        if (value.__lookupGetter__) {
          if (value.__lookupGetter__(key)) {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Getter/Setter]', 'special');
            } else {
              str = stylize('[Getter]', 'special');
            }
          } else {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Setter]', 'special');
            }
          }
        }
        if (indexOf(visible_keys, key) < 0) {
          name = '[' + key + ']';
        }
        if (!str) {
          if (indexOf(seen, value[key]) < 0) {
            if (recurseTimes === null) {
              str = format(value[key]);
            } else {
              str = format(value[key], recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
              if (isArray(value)) {
                str = map(str.split('\n'), function (line) {
                  return '  ' + line;
                }).join('\n').substr(2);
              } else {
                str = '\n' + map(str.split('\n'), function (line) {
                  return '   ' + line;
                }).join('\n');
              }
            }
          } else {
            str = stylize('[Circular]', 'special');
          }
        }
        if (typeof name === 'undefined') {
          if (type === 'Array' && key.match(/^\d+$/)) {
            return str;
          }
          name = json.stringify('' + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = stylize(name, 'name');
          } else {
            name = name.replace(/'/g, "\\'")
                       .replace(/\\"/g, '"')
                       .replace(/(^"|"$)/g, "'");
            name = stylize(name, 'string');
          }
        }

        return name + ': ' + str;
      });

      seen.pop();

      var numLinesEst = 0;
      var length = reduce(output, function (prev, cur) {
        numLinesEst++;
        if (indexOf(cur, '\n') >= 0) numLinesEst++;
        return prev + cur.length + 1;
      }, 0);

      if (length > 50) {
        output = braces[0] +
                 (base === '' ? '' : base + '\n ') +
                 ' ' +
                 output.join(',\n  ') +
                 ' ' +
                 braces[1];

      } else {
        output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
      }

      return output;
    }
    return format(obj, (typeof depth === 'undefined' ? 2 : depth));
  }

  expect.stringify = i;

  function isArray (ar) {
    return Object.prototype.toString.call(ar) === '[object Array]';
  }

  function isRegExp(re) {
    var s;
    try {
      s = '' + re;
    } catch (e) {
      return false;
    }

    return re instanceof RegExp || // easy case
           // duck-type for context-switching evalcx case
           typeof(re) === 'function' &&
           re.constructor.name === 'RegExp' &&
           re.compile &&
           re.test &&
           re.exec &&
           s.match(/^\/.*\/[gim]{0,3}$/);
  }

  function isDate(d) {
    return d instanceof Date;
  }

  function keys (obj) {
    if (Object.keys) {
      return Object.keys(obj);
    }

    var keys = [];

    for (var i in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, i)) {
        keys.push(i);
      }
    }

    return keys;
  }

  function map (arr, mapper, that) {
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, mapper, that);
    }

    var other= new Array(arr.length);

    for (var i= 0, n = arr.length; i<n; i++)
      if (i in arr)
        other[i] = mapper.call(that, arr[i], i, arr);

    return other;
  }

  function reduce (arr, fun) {
    if (Array.prototype.reduce) {
      return Array.prototype.reduce.apply(
          arr
        , Array.prototype.slice.call(arguments, 1)
      );
    }

    var len = +this.length;

    if (typeof fun !== "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2) {
      var rv = arguments[1];
    } else {
      do {
        if (i in this) {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      } while (true);
    }

    for (; i < len; i++) {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  }

  /**
   * Asserts deep equality
   *
   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
   * @api private
   */

  expect.eql = function eql(actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if ('undefined' != typeof Buffer
      && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

      // 7.2. If the expected value is a Date object, the actual value is
      // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();

      // 7.3. Other pairs that do not both pass typeof value == "object",
      // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
      return actual == expected;
    // If both are regular expression use the special `regExpEquiv` method
    // to determine equivalence.
    } else if (isRegExp(actual) && isRegExp(expected)) {
      return regExpEquiv(actual, expected);
    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  };

  function isUndefinedOrNull (value) {
    return value === null || value === undefined;
  }

  function isArguments (object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function regExpEquiv (a, b) {
    return a.source === b.source && a.global === b.global &&
           a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
  }

  function objEquiv (a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
      return false;
    // an identical "prototype" property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
      if (!isArguments(b)) {
        return false;
      }
      a = pSlice.call(a);
      b = pSlice.call(b);
      return expect.eql(a, b);
    }
    try{
      var ka = keys(a),
        kb = keys(b),
        key, i;
    } catch (e) {//happens when one is a string literal and the other isn't
      return false;
    }
    // having the same number of owned properties (keys incorporates hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!expect.eql(a[key], b[key]))
         return false;
    }
    return true;
  }

  var json = (function () {
    "use strict";

    if ('object' == typeof JSON && JSON.parse && JSON.stringify) {
      return {
          parse: nativeJSON.parse
        , stringify: nativeJSON.stringify
      }
    }

    var JSON = {};

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    function date(d, key) {
      return isFinite(d.valueOf()) ?
          d.getUTCFullYear()     + '-' +
          f(d.getUTCMonth() + 1) + '-' +
          f(d.getUTCDate())      + 'T' +
          f(d.getUTCHours())     + ':' +
          f(d.getUTCMinutes())   + ':' +
          f(d.getUTCSeconds())   + 'Z' : null;
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

  // Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

        if (value instanceof Date) {
            value = date(key);
        }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

  // What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

            return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

        case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

            if (!value) {
                return 'null';
            }

  // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

  // Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

  // If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

  // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

  // If the JSON object does not yet have a stringify method, give it one.

    JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

        var i;
        gap = '';
        indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

  // If the space parameter is a string, it will be used as the indent string.

        } else if (typeof space === 'string') {
            indent = space;
        }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

        return str('', {'': value});
    };

  // If the JSON object does not yet have a parse method, give it one.

    JSON.parse = function (text, reviver) {
    // The parse method takes a text and an optional reviver function, and returns
    // a JavaScript value if the text is a valid JSON text.

        var j;

        function walk(holder, key) {

    // The walk method is used to recursively walk the resulting structure so
    // that modifications can be made.

            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }


    // Parsing happens in four stages. In the first stage, we replace certain
    // Unicode characters with escape sequences. JavaScript handles many characters
    // incorrectly, either silently deleting them, or treating them as line endings.

        text = String(text);
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

    // In the second stage, we run the text against regular expressions that look
    // for non-JSON patterns. We are especially concerned with '()' and 'new'
    // because they can cause invocation, and '=' because it can cause mutation.
    // But just to be safe, we want to reject all unexpected forms.

    // We split the second stage into 4 regexp operations in order to work around
    // crippling inefficiencies in IE's and Safari's regexp engines. First we
    // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
    // replace all simple value tokens with ']' characters. Third, we delete all
    // open brackets that follow a colon or comma or that begin the text. Finally,
    // we look to see that the remaining characters are only whitespace or ']' or
    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

        if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

    // In the third stage we use the eval function to compile the text into a
    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
    // in JavaScript: it can begin a block or an object literal. We wrap the text
    // in parens to eliminate the ambiguity.

            j = eval('(' + text + ')');

    // In the optional fourth stage, we recursively walk the new structure, passing
    // each name/value pair to a reviver function for possible transformation.

            return typeof reviver === 'function' ?
                walk({'': j}, '') : j;
        }

    // If the text is not JSON parseable, then a SyntaxError is thrown.

        throw new SyntaxError('JSON.parse');
    };

    return JSON;
  })();

  if ('undefined' != typeof window) {
    window.expect = module.exports;
  }

})(
    this
  , 'undefined' != typeof module ? module : {exports: {}}
);

}).call(this,require("buffer").Buffer)
},{"buffer":10}],7:[function(require,module,exports){
/*
	The Cedric's Swiss Knife (CSK) - CSK NextGen Events
	
	Copyright (c) 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



// Create the object && export it
function NextGenEvents() { return Object.create( NextGenEvents.prototype ) ; }
module.exports = NextGenEvents ;





			/* Basic features, more or less compatible with Node.js */



NextGenEvents.SYNC = -Infinity ;

// Not part of the prototype, because it should not pollute userland's prototype.
// It has an eventEmitter as 'this' anyway (always called using call()).
NextGenEvents.init = function init()
{
	Object.defineProperty( this , '__ngev' , { value: {
		nice: NextGenEvents.SYNC ,
		interruptible: false ,
		recursion: 0 ,
		contexts: {} ,
		events: {
			// Special events
			error: [] ,
			interrupt: [] ,
			newListener: [] ,
			removeListener: []
		}
	} } ) ;
} ;



// Use it with .bind()
NextGenEvents.filterOutCallback = function( what , currentElement ) { return what !== currentElement ; } ;



// .addListener( eventName , [fn] , [options] )
NextGenEvents.prototype.addListener = function addListener( eventName , fn , options )
{
	var listener = {} ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.events[ eventName ] ) { this.__ngev.events[ eventName ] = [] ; }
	
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".addListener(): argument #0 should be a non-empty string" ) ; }
	
	if ( typeof fn !== 'function' )
	{
		options = fn ;
		fn = undefined ;
	}
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	listener.fn = fn || options.fn ;
	listener.id = typeof options.id === 'string' ? options.id : listener.fn ;
	listener.once = !! options.once ;
	listener.async = !! options.async ;
	listener.nice = options.nice !== undefined ? Math.floor( options.nice ) : NextGenEvents.SYNC ;
	listener.context = typeof options.context === 'string' ? options.context : null ;
	
	if ( typeof listener.fn !== 'function' )
	{
		throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
	}
	
	// Implicit context creation
	if ( listener.context && typeof listener.context === 'string' && ! this.__ngev.contexts[ listener.context ] )
	{
		this.addListenerContext( listener.context ) ;
	}
	
	// Note: 'newListener' and 'removeListener' event return an array of listener, but not the event name.
	// So the event's name can be retrieved in the listener itself.
	listener.event = eventName ;
	
	// We should emit 'newListener' first, before adding it to the listeners,
	// to avoid recursion in the case that eventName === 'newListener'
	if ( this.__ngev.events.newListener.length )
	{
		// Return an array, because .addListener() may support multiple event addition at once
		// e.g.: .addListener( { request: onRequest, close: onClose, error: onError } ) ;
		this.emit( 'newListener' , [ listener ] ) ;
	}
	
	this.__ngev.events[ eventName ].push( listener ) ;
	
	return this ;
} ;



NextGenEvents.prototype.on = NextGenEvents.prototype.addListener ;



// Shortcut
NextGenEvents.prototype.once = function once( eventName , options )
{
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".once(): argument #0 should be a non-empty string" ) ; }
	
	if ( typeof options === 'function' )
	{
		options = { id: options , fn: options } ;
	}
	else if ( ! options || typeof options !== 'object' || typeof options.fn !== 'function' )
	{
		throw new TypeError( ".once(): argument #1 should be a function or an object with a 'fn' property which value is a function" ) ;
	}
	
	options.once = true ;
	
	return this.addListener( eventName , options ) ;
} ;



NextGenEvents.prototype.removeListener = function removeListener( eventName , id )
{
	var i , length , newListeners = [] , removedListeners = [] ;
	
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeListener(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.events[ eventName ] ) { this.__ngev.events[ eventName ] = [] ; }
	
	length = this.__ngev.events[ eventName ].length ;
	
	// It's probably faster to create a new array of listeners
	for ( i = 0 ; i < length ; i ++ )
	{
		if ( this.__ngev.events[ eventName ][ i ].id === id )
		{
			removedListeners.push( this.__ngev.events[ eventName ][ i ] ) ;
		}
		else
		{
			newListeners.push( this.__ngev.events[ eventName ][ i ] ) ;
		}
	}
	
	this.__ngev.events[ eventName ] = newListeners ;
	
	if ( removedListeners.length && this.__ngev.events.removeListener.length )
	{
		this.emit( 'removeListener' , removedListeners ) ;
	}
	
	return this ;
} ;



NextGenEvents.prototype.off = NextGenEvents.prototype.removeListener ;



NextGenEvents.prototype.removeAllListeners = function removeAllListeners( eventName )
{
	var removedListeners ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	if ( eventName )
	{
		// Remove all listeners for a particular event
		
		if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeAllListener(): argument #0 should be undefined or a non-empty string" ) ; }
		
		if ( ! this.__ngev.events[ eventName ] ) { this.__ngev.events[ eventName ] = [] ; }
		
		removedListeners = this.__ngev.events[ eventName ] ;
		this.__ngev.events[ eventName ] = [] ;
		
		if ( removedListeners.length && this.__ngev.events.removeListener.length )
		{
			this.emit( 'removeListener' , removedListeners ) ;
		}
	}
	else
	{
		// Remove all listeners for any events
		// 'removeListener' listeners cannot be triggered: they are already deleted
		this.__ngev.events = {} ;
	}
	
	return this ;
} ;



NextGenEvents.listenerWrapper = function listenerWrapper( listener , event , context )
{
	var returnValue , serial ;
	
	if ( event.interrupt ) { return ; }
	
	if ( listener.async )
	{
		//serial = context && context.serial ;
		if ( context )
		{
			serial = context.serial ;
			context.ready = ! serial ;
		}
		
		returnValue = listener.fn.apply( undefined , event.args.concat( function( arg ) {
			
			event.listenersDone ++ ;
			
			// Async interrupt
			if ( arg && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' )
			{
				event.interrupt = arg ;
				
				if ( event.callback )
				{
					event.callback( event.interrupt , event ) ;
					delete event.callback ;
				}
				
				event.emitter.emit( 'interrupt' , event.interrupt ) ;
			}
			else if ( event.listenersDone >= event.listeners && event.callback )
			{
				event.callback( undefined , event ) ;
				delete event.callback ;
			}
			
			// Process the queue if serialized
			if ( serial ) { NextGenEvents.processQueue.call( event.emitter , listener.context , true ) ; }
			
		} ) ) ;
	}
	else
	{
		returnValue = listener.fn.apply( undefined , event.args ) ;
		event.listenersDone ++ ;
	}
	
	// Interrupt if non-falsy return value, if the emitter is interruptible, not already interrupted (emit once),
	// and not within an 'interrupt' event.
	if ( returnValue && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' )
	{
		event.interrupt = returnValue ;
		
		if ( event.callback )
		{
			event.callback( event.interrupt , event ) ;
			delete event.callback ;
		}
		
		event.emitter.emit( 'interrupt' , event.interrupt ) ;
	}
	else if ( event.listenersDone >= event.listeners && event.callback )
	{
		event.callback( undefined , event ) ;
		delete event.callback ;
	}
} ;



// A unique event ID
var nextEventId = 0 ;



/*
	emit( [nice] , eventName , [arg1] , [arg2] , [...] , [emitCallback] )
*/
NextGenEvents.prototype.emit = function emit()
{
	var i , iMax , count = 0 ,
		event , listener , context , currentNice ,
		listeners , removedListeners = [] ;
	
	event = {
		emitter: this ,
		id: nextEventId ++ ,
		name: null ,
		args: null ,
		nice: null ,
		interrupt: null ,
		listeners: null ,
		listenersDone: 0 ,
		callback: null ,
	} ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	// Arguments handling
	if ( typeof arguments[ 0 ] === 'number' )
	{
		event.nice = Math.floor( arguments[ 0 ] ) ;
		event.name = arguments[ 1 ] ;
		if ( ! event.name || typeof event.name !== 'string' ) { throw new TypeError( ".emit(): when argument #0 is a number, argument #1 should be a non-empty string" ) ; }
		
		if ( typeof arguments[ arguments.length - 1 ] === 'function' )
		{
			event.callback = arguments[ arguments.length - 1 ] ;
			event.args = Array.prototype.slice.call( arguments , 2 , -1 ) ;
		}
		else
		{
			event.args = Array.prototype.slice.call( arguments , 2 ) ;
		}
	}
	else
	{
		event.nice = this.__ngev.nice ;
		event.name = arguments[ 0 ] ;
		if ( ! event.name || typeof event.name !== 'string' ) { throw new TypeError( ".emit(): argument #0 should be an number or a non-empty string" ) ; }
		event.args = Array.prototype.slice.call( arguments , 1 ) ;
		
		if ( typeof arguments[ arguments.length - 1 ] === 'function' )
		{
			event.callback = arguments[ arguments.length - 1 ] ;
			event.args = Array.prototype.slice.call( arguments , 1 , -1 ) ;
		}
		else
		{
			event.args = Array.prototype.slice.call( arguments , 1 ) ;
		}
	}
	
	
	if ( ! this.__ngev.events[ event.name ] ) { this.__ngev.events[ event.name ] = [] ; }
	
	// Increment this.__ngev.recursion
	event.listeners = this.__ngev.events[ event.name ].length ;
	this.__ngev.recursion ++ ;
	
	// Trouble arise when a listener is removed from another listener, while we are still in the loop.
	// So we have to COPY the listener array right now!
	listeners = this.__ngev.events[ event.name ].slice() ;
	
	for ( i = 0 , iMax = listeners.length ; i < iMax ; i ++ )
	{
		count ++ ;
		listener = listeners[ i ] ;
		context = listener.context && this.__ngev.contexts[ listener.context ] ;
		
		// If the listener context is disabled...
		if ( context && context.status === NextGenEvents.CONTEXT_DISABLED ) { continue ; }
		
		// The nice value for this listener...
		if ( context ) { currentNice = Math.max( event.nice , listener.nice , context.nice ) ; }
		else { currentNice = Math.max( event.nice , listener.nice ) ; }
		
		
		if ( listener.once )
		{
			// We should remove the current listener RIGHT NOW because of recursive .emit() issues:
			// one listener may eventually fire this very same event synchronously during the current loop.
			this.__ngev.events[ event.name ] = this.__ngev.events[ event.name ].filter(
				NextGenEvents.filterOutCallback.bind( undefined , listener )
			) ;
			
			removedListeners.push( listener ) ;
		}
		
		if ( context && ( context.status === NextGenEvents.CONTEXT_QUEUED || ! context.ready ) )
		{
			// Almost all works should be done by .emit(), and little few should be done by .processQueue()
			context.queue.push( { event: event , listener: listener , nice: currentNice } ) ;
		}
		else
		{
			try {
				if ( currentNice < 0 )
				{
					if ( this.__ngev.recursion >= - currentNice )
					{
						setImmediate( NextGenEvents.listenerWrapper.bind( this , listener , event , context ) ) ;
					}
					else
					{
						NextGenEvents.listenerWrapper.call( this , listener , event , context ) ;
					}
				}
				else
				{
					setTimeout( NextGenEvents.listenerWrapper.bind( this , listener , event , context ) , currentNice ) ;
				}
			}
			catch ( error ) {
				// Catch error, just to decrement this.__ngev.recursion, re-throw after that...
				this.__ngev.recursion -- ;
				throw error ;
			}
		}
	}
	
	// Decrement recursion
	this.__ngev.recursion -- ;
	
	// Emit 'removeListener' after calling listeners
	if ( removedListeners.length && this.__ngev.events.removeListener.length )
	{
		this.emit( 'removeListener' , removedListeners ) ;
	}
	
	
	// 'error' event is a special case: it should be listened for, or it will throw an error
	if ( ! count )
	{
		if ( event.name === 'error' )
		{
			if ( arguments[ 1 ] ) { throw arguments[ 1 ] ; }
			else { throw Error( "Uncaught, unspecified 'error' event." ) ; }
		}
		
		if ( event.callback )
		{
			event.callback( undefined , event ) ;
			delete event.callback ;
		}
	}
	
	return event ;
} ;



NextGenEvents.prototype.listeners = function listeners( eventName )
{
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listeners(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.events[ eventName ] ) { this.__ngev.events[ eventName ] = [] ; }
	
	// Do not return the array, shallow copy it
	return this.__ngev.events[ eventName ].slice() ;
} ;



NextGenEvents.listenerCount = function( emitter , eventName )
{
	if ( ! emitter || ! ( emitter instanceof NextGenEvents ) ) { throw new TypeError( ".listenerCount(): argument #0 should be an instance of NextGenEvents" ) ; }
	return emitter.listenerCount( eventName ) ;
} ;



NextGenEvents.prototype.listenerCount = function( eventName )
{
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listenerCount(): argument #1 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.events[ eventName ] ) { this.__ngev.events[ eventName ] = [] ; }
	
	return this.__ngev.events[ eventName ].length ;
} ;



NextGenEvents.prototype.setNice = function setNice( nice )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }
	
	this.__ngev.nice = Math.floor( +nice || 0 ) ;
} ;



NextGenEvents.prototype.setInterruptible = function setInterruptible( value )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }
	
	this.__ngev.interruptible = !! value ;
} ;



// There is no such thing in NextGenEvents, however, we need to be compatible with node.js events at best
NextGenEvents.prototype.setMaxListeners = function() {} ;

// Sometime useful as a no-op callback...
NextGenEvents.noop = function() {} ;





			/* Next Gen feature: contexts! */



NextGenEvents.CONTEXT_ENABLED = 0 ;
NextGenEvents.CONTEXT_DISABLED = 1 ;
NextGenEvents.CONTEXT_QUEUED = 2 ;



NextGenEvents.prototype.addListenerContext = function addListenerContext( contextName , options )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".addListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! this.__ngev.contexts[ contextName ] )
	{
		// A context IS an event emitter too!
		this.__ngev.contexts[ contextName ] = Object.create( NextGenEvents.prototype ) ;
		this.__ngev.contexts[ contextName ].nice = NextGenEvents.SYNC ;
		this.__ngev.contexts[ contextName ].ready = true ;
		this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_ENABLED ;
		this.__ngev.contexts[ contextName ].serial = false ;
		this.__ngev.contexts[ contextName ].queue = [] ;
	}
	
	if ( options.nice !== undefined ) { this.__ngev.contexts[ contextName ].nice = Math.floor( options.nice ) ; }
	if ( options.status !== undefined ) { this.__ngev.contexts[ contextName ].status = options.status ; }
	if ( options.serial !== undefined ) { this.__ngev.contexts[ contextName ].serial = !! options.serial ; }
	
	return this ;
} ;



NextGenEvents.prototype.disableListenerContext = function disableListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_DISABLED ;
	
	return this ;
} ;



NextGenEvents.prototype.enableListenerContext = function enableListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".enableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_ENABLED ;
	
	if ( this.__ngev.contexts[ contextName ].queue.length > 0 ) { NextGenEvents.processQueue.call( this , contextName ) ; }
	
	return this ;
} ;



NextGenEvents.prototype.queueListenerContext = function queueListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".queueListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_QUEUED ;
	
	return this ;
} ;



NextGenEvents.prototype.serializeListenerContext = function serializeListenerContext( contextName , value )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".serializeListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].serial = value === undefined ? true : !! value ;
	
	return this ;
} ;



NextGenEvents.prototype.setListenerContextNice = function setListenerContextNice( contextName , nice )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".setListenerContextNice(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].nice = Math.floor( nice ) ;
	
	return this ;
} ;



NextGenEvents.prototype.destroyListenerContext = function destroyListenerContext( contextName )
{
	var i , length , eventName , newListeners , removedListeners = [] ;
	
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	// We don't care if a context actually exists, all listeners tied to that contextName will be removed
	
	for ( eventName in this.__ngev.events )
	{
		newListeners = null ;
		length = this.__ngev.events[ eventName ].length ;
		
		for ( i = 0 ; i < length ; i ++ )
		{
			if ( this.__ngev.events[ eventName ][ i ].context === contextName )
			{
				newListeners = [] ;
				removedListeners.push( this.__ngev.events[ eventName ][ i ] ) ;
			}
			else if ( newListeners )
			{
				newListeners.push( this.__ngev.events[ eventName ][ i ] ) ;
			}
		}
		
		if ( newListeners ) { this.__ngev.events[ eventName ] = newListeners ; }
	}
	
	if ( this.__ngev.contexts[ contextName ] ) { delete this.__ngev.contexts[ contextName ] ; }
	
	if ( removedListeners.length && this.__ngev.events.removeListener.length )
	{
		this.emit( 'removeListener' , removedListeners ) ;
	}
	
	return this ;
} ;



// To be used with .call(), it should not pollute the prototype
NextGenEvents.processQueue = function processQueue( contextName , isCompletionCallback )
{
	var context , job ;
	
	// The context doesn't exist anymore, so just abort now
	if ( ! this.__ngev.contexts[ contextName ] ) { return ; }
	
	context = this.__ngev.contexts[ contextName ] ;
	
	if ( isCompletionCallback ) { context.ready = true ; }
	
	// Should work on serialization here
	
	//console.log( ">>> " , context ) ;
	
	// Increment recursion
	this.__ngev.recursion ++ ;
	
	while ( context.ready && context.queue.length )
	{
		job = context.queue.shift() ;
		
		// This event has been interrupted, drop it now!
		if ( job.event.interrupt ) { continue ; }
		
		try {
			if ( job.nice < 0 )
			{
				if ( this.__ngev.recursion >= - job.nice )
				{
					setImmediate( NextGenEvents.listenerWrapper.bind( this , job.listener , job.event , context ) ) ;
				}
				else
				{
					NextGenEvents.listenerWrapper.call( this , job.listener , job.event , context ) ;
				}
			}
			else
			{
				setTimeout( NextGenEvents.listenerWrapper.bind( this , job.listener , job.event , context ) , job.nice ) ;
			}
		}
		catch ( error ) {
			// Catch error, just to decrement this.__ngev.recursion, re-throw after that...
			this.__ngev.recursion -- ;
			throw error ;
		}
	}
	
	// Decrement recursion
	this.__ngev.recursion -- ;
} ;




},{}],8:[function(require,module,exports){
/*
	The Cedric's Swiss Knife (CSK) - CSK object tree toolbox

	Copyright (c) 2014, 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	== Extend function ==
*/

/*
	options:
		* own: only copy own properties that are enumerable
		* nonEnum: copy non-enumerable properties as well, works only with own:true
		* descriptor: preserve property's descriptor
		* deep: perform a deep (recursive) extend
		* maxDepth: used in conjunction with deep, when max depth is reached an exception is raised, default to 100 when
			the 'circular' option is off, or default to null if 'circular' is on
		* circular: circular references reconnection
		* move: move properties to target (delete properties from the sources)
		* preserve: existing properties in the target object are not overwritten
		* nofunc: skip functions
		* deepFunc: in conjunction with 'deep', this will process sources functions like objects rather than
			copying/referencing them directly into the source, thus, the result will not be a function, it forces 'deep'
		* proto: try to clone objects with the right prototype, using Object.create() or mutating it with __proto__,
			it forces option 'own'.
		* inherit: rather than mutating target prototype for source prototype like the 'proto' option does, here it is
			the source itself that IS the prototype for the target. Force option 'own' and disable 'proto'.
		* skipRoot: the prototype of the target root object is NOT mutated only if this option is set.
		* flat: extend into the target top-level only, compose name with the path of the source, force 'deep',
			disable 'unflat', 'proto', 'inherit'
		* unflat: assume sources are in the 'flat' format, expand all properties deeply into the target, disable 'flat'
		* deepFilter
			* blacklist: list of black-listed prototype: the recursiveness of the 'deep' option will be disabled
				for object whose prototype is listed
			* whitelist: the opposite of blacklist
*/
function extend( runtime , options , target )
{
	var i , j , jmax , source , sourceKeys , sourceKey , sourceValue ,
		value , sourceDescriptor , targetKey , targetPointer , path ,
		indexOfSource = -1 , newTarget = false , length = arguments.length ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	// Things applied only for the first call, not for recursive call
	if ( ! runtime )
	{
		runtime = { depth: 0 , prefix: '' } ;
		
		if ( ! options.maxDepth && options.deep && ! options.circular ) { options.maxDepth = 100 ; }
		
		if ( options.deepFunc ) { options.deep = true ; }
		
		if ( options.deepFilter && typeof options.deepFilter === 'object' )
		{
			if ( options.deepFilter.whitelist && ( ! Array.isArray( options.deepFilter.whitelist ) || ! options.deepFilter.whitelist.length ) ) { delete options.deepFilter.whitelist ; }
			if ( options.deepFilter.blacklist && ( ! Array.isArray( options.deepFilter.blacklist ) || ! options.deepFilter.blacklist.length ) ) { delete options.deepFilter.blacklist ; }
			if ( ! options.deepFilter.whitelist && ! options.deepFilter.blacklist ) { delete options.deepFilter ; }
		}
		
		// 'flat' option force 'deep'
		if ( options.flat )
		{
			options.deep = true ;
			options.proto = false ;
			options.inherit = false ;
			options.unflat = false ;
			if ( typeof options.flat !== 'string' ) { options.flat = '.' ; }
		}
		
		if ( options.unflat )
		{
			options.deep = false ;
			options.proto = false ;
			options.inherit = false ;
			options.flat = false ;
			if ( typeof options.unflat !== 'string' ) { options.unflat = '.' ; }
		}
		
		// If the prototype is applied, only owned properties should be copied
		if ( options.inherit ) { options.own = true ; options.proto = false ; }
		else if ( options.proto ) { options.own = true ; }
		
		if ( ! target || ( typeof target !== 'object' && typeof target !== 'function' ) )
		{
			newTarget = true ;
		}
		
		if ( ! options.skipRoot && ( options.inherit || options.proto ) )
		{
			for ( i = length - 1 ; i >= 3 ; i -- )
			{
				source = arguments[ i ] ;
				if ( source && ( typeof source === 'object' || typeof source === 'function' ) )
				{
					if ( options.inherit )
					{
						if ( newTarget ) { target = Object.create( source ) ; }
						else { target.__proto__ = source ; }	// jshint ignore:line
					}
					else if ( options.proto )
					{
						if ( newTarget ) { target = Object.create( source.__proto__ ) ; }	// jshint ignore:line
						else { target.__proto__ = source.__proto__ ; }	// jshint ignore:line
					}
					
					break ;
				}
			}
		}
		else if ( newTarget )
		{
			target = {} ;
		}
		
		runtime.references = { sources: [] , targets: [] } ;
	}
	
	
	// Max depth check
	if ( options.maxDepth && runtime.depth > options.maxDepth )
	{
		throw new Error( '[tree] extend(): max depth reached(' + options.maxDepth + ')' ) ;
	}
	
	
	// Real extend processing part
	for ( i = 3 ; i < length ; i ++ )
	{
		source = arguments[ i ] ;
		if ( ! source || ( typeof source !== 'object' && typeof source !== 'function' ) ) { continue ; }
		
		if ( options.circular )
		{
			runtime.references.sources.push( source ) ;
			runtime.references.targets.push( target ) ;
		}
		
		if ( options.own )
		{
			if ( options.nonEnum ) { sourceKeys = Object.getOwnPropertyNames( source ) ; }
			else { sourceKeys = Object.keys( source ) ; }
		}
		else { sourceKeys = source ; }
		
		for ( sourceKey in sourceKeys )
		{
			if ( options.own ) { sourceKey = sourceKeys[ sourceKey ] ; }
			
			// If descriptor is on, get it now
			if ( options.descriptor )
			{
				sourceDescriptor = Object.getOwnPropertyDescriptor( source , sourceKey ) ;
				sourceValue = sourceDescriptor.value ;
			}
			else
			{
				// We have to trigger an eventual getter only once
				sourceValue = source[ sourceKey ] ;
			}
			
			targetPointer = target ;
			targetKey = runtime.prefix + sourceKey ;
			
			// Do not copy if property is a function and we don't want them
			if ( options.nofunc && typeof sourceValue === 'function' ) { continue; }
			
			// 'unflat' mode computing
			if ( options.unflat && runtime.depth === 0 )
			{
				path = sourceKey.split( options.unflat ) ;
				jmax = path.length - 1 ;
				
				if ( jmax )
				{
					for ( j = 0 ; j < jmax ; j ++ )
					{
						if ( ! targetPointer[ path[ j ] ] ||
							( typeof targetPointer[ path[ j ] ] !== 'object' &&
								typeof targetPointer[ path[ j ] ] !== 'function' ) )
						{
							targetPointer[ path[ j ] ] = {} ;
						}
						
						targetPointer = targetPointer[ path[ j ] ] ;
					}
					
					targetKey = runtime.prefix + path[ jmax ] ;
				}
			}
			
			
			if ( options.deep &&
				sourceValue &&
				( typeof sourceValue === 'object' || ( options.deepFunc && typeof sourceValue === 'function' ) ) &&
				( ! options.descriptor || ! sourceDescriptor.get ) &&
				( ! options.deepFilter ||
					( ( ! options.deepFilter.whitelist || options.deepFilter.whitelist.indexOf( sourceValue.__proto__ ) !== -1 ) &&	// jshint ignore:line
						( ! options.deepFilter.blacklist || options.deepFilter.blacklist.indexOf( sourceValue.__proto__ ) === -1 ) ) ) ) // jshint ignore:line
			{
				if ( options.circular )
				{
					indexOfSource = runtime.references.sources.indexOf( sourceValue ) ;
				}
				
				if ( options.flat )
				{
					// No circular references reconnection when in 'flat' mode
					if ( indexOfSource >= 0 ) { continue ; }
					
					extend(
						{ depth: runtime.depth + 1 , prefix: runtime.prefix + sourceKey + options.flat , references: runtime.references } ,
						options , targetPointer , sourceValue
					) ;
				}
				else
				{
					if ( indexOfSource >= 0 )
					{
						// Circular references reconnection...
						if ( options.descriptor )
						{
							Object.defineProperty( targetPointer , targetKey , {
								value: runtime.references.targets[ indexOfSource ] ,
								enumerable: sourceDescriptor.enumerable ,
								writable: sourceDescriptor.writable ,
								configurable: sourceDescriptor.configurable
							} ) ;
						}
						else
						{
							targetPointer[ targetKey ] = runtime.references.targets[ indexOfSource ] ;
						}
						
						continue ;
					}
					
					if ( ! targetPointer[ targetKey ] || ! targetPointer.hasOwnProperty( targetKey ) || ( typeof targetPointer[ targetKey ] !== 'object' && typeof targetPointer[ targetKey ] !== 'function' ) )
					{
						if ( Array.isArray( sourceValue ) ) { value = [] ; }
						else if ( options.proto ) { value = Object.create( sourceValue.__proto__ ) ; }	// jshint ignore:line
						else if ( options.inherit ) { value = Object.create( sourceValue ) ; }
						else { value = {} ; }
						
						if ( options.descriptor )
						{
							Object.defineProperty( targetPointer , targetKey , {
								value: value ,
								enumerable: sourceDescriptor.enumerable ,
								writable: sourceDescriptor.writable ,
								configurable: sourceDescriptor.configurable
							} ) ;
						}
						else
						{
							targetPointer[ targetKey ] = value ;
						}
					}
					else if ( options.proto && targetPointer[ targetKey ].__proto__ !== sourceValue.__proto__ )	// jshint ignore:line
					{
						targetPointer[ targetKey ].__proto__ = sourceValue.__proto__ ;	// jshint ignore:line
					}
					else if ( options.inherit && targetPointer[ targetKey ].__proto__ !== sourceValue )	// jshint ignore:line
					{
						targetPointer[ targetKey ].__proto__ = sourceValue ;	// jshint ignore:line
					}
					
					if ( options.circular )
					{
						runtime.references.sources.push( sourceValue ) ;
						runtime.references.targets.push( targetPointer[ targetKey ] ) ;
					}
					
					// Recursively extends sub-object
					extend(
						{ depth: runtime.depth + 1 , prefix: '' , references: runtime.references } ,
						options , targetPointer[ targetKey ] , sourceValue
					) ;
				}
			}
			else if ( options.preserve && targetPointer[ targetKey ] !== undefined )
			{
				// Do not overwrite, and so do not delete source's properties that were not moved
				continue ;
			}
			else if ( ! options.inherit )
			{
				if ( options.descriptor ) { Object.defineProperty( targetPointer , targetKey , sourceDescriptor ) ; }
				else { targetPointer[ targetKey ] = sourceValue ; }
			}
			
			// Delete owned property of the source object
			if ( options.move ) { delete source[ sourceKey ] ; }
		}
	}
	
	return target ;
}



// The extend() method as publicly exposed
module.exports = extend.bind( undefined , null ) ;



},{}],9:[function(require,module,exports){
(function (process){
/*
	Async Kit
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

/* jshint unused:false */
/* global describe, it, before, after */

/*
	TODO:
	
	Async.EventEmitter
	Async.Plan:
		.clone()
		.export()
		.while( condition , true )
		.race()
		.waterfall()
		.iterator() & .usingIterator() -- should be mostly covered by foreach
		.aggregator()
	Exec:
		.execArgs()
*/

"use strict" ;



var expect = require( 'expect.js' ) ;

var async ;

if ( process.browser )
{
	async = require( '../lib/browser.js' ) ;
}
else
{
	async = require( '../lib/async.js' ) ;
}





			/* Helper functions */



function createStats( n )
{
	var i ;
	var stats = {
		startCounter: [] ,
		endCounter: [] ,
		order: [] ,
		plan: {
			then: 0 ,
			'else': 0 ,
			'catch': 0 ,
			'finally': 0
		} ,
		exec: {
			then: 0 ,
			'else': 0 ,
			'catch': 0 ,
			'finally': 0
		}
	} ;
	
	for ( i = 0 ; i < n ; i ++ ) { stats.startCounter[ i ] = stats.endCounter[ i ] = 0 ; }
	
	return stats ;
}



function asyncJob( stats , id , delay , options , result , callback )
{
	var jobContext = this , realResult = result.slice() ;
	
	stats.startCounter[ id ] ++ ;
	
	setTimeout( function() {
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		
		if ( typeof options.failCount === 'number' && options.failCount >= stats.endCounter[ id ] && ! ( result[ 0 ] instanceof Error ) )
		{
			realResult[ 0 ] = new Error( "Planned failure" ) ;
		}
		
		if ( options.abort ) { jobContext.abort.apply( jobContext , realResult ) ; }
		else { callback.apply( undefined , realResult ) ; }
		
	} , delay ) ;
}



function syncJob( stats , id , options , result , callback )
{
	var realResult = result.slice() ;
	
	stats.startCounter[ id ] ++ ;
	stats.endCounter[ id ] ++ ;
	stats.order.push( id ) ;
	
	if ( typeof options.failCount === 'number' && options.failCount >= stats.endCounter[ id ] && ! ( result[ 0 ] instanceof Error ) )
	{
		realResult[ 0 ] = new Error( "Planned failure" ) ;
	}
	
	if ( options.abort ) { this.abort.apply( this , realResult ) ; }
	else { callback.apply( undefined , realResult ) ; }
}





			/* Tests */



describe( "async.series()" , function() {
	
	it( "should run the series of job which do not have errors, in the good order, and trigger the callback with the correct result" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a job has error, it should start running a series of job, be interrupted by that error and return it" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a function is given instead of an array of job, it should format the result using the returnLastResultOnly mode" , function( done ) {
		
		var stats = createStats( 1 ) ;
		
		async.series( function ( callback ) {
			asyncJob( stats , 0 , 50 , {} , [ undefined , 'my wonderful result' ] , callback ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.equal( 'my wonderful result' ) ;
			expect( stats.endCounter ).to.eql( [ 1 ] ) ;
			expect( stats.order ).to.eql( [ 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a function is given instead of an array of job that transmit error, it should be directly transmited as the global error" , function( done ) {
		
		var stats = createStats( 1 ) ;
		
		async.do( function ( callback ) {
			asyncJob( stats , 0 , 50 , {} , [ new Error() , 'my wonderful result' ] , callback ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.equal( 'my wonderful result' ) ;
			expect( stats.endCounter ).to.eql( [ 1 ] ) ;
			expect( stats.order ).to.eql( [ 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
} ) ;



describe( "async.parallel()" , function() {
	
	it( "should run jobs which do not have errors in parallel, and trigger the callback with the correct result" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a job has error, it should start running jobs in parallel, be interrupted by that error and trigger callback with it before other pending jobs can complete" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ new Error() , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ undefined , undefined , [ new Error() , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 0, 0, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the slower job has error, it should start running jobs in parallel, all other job complete and it trigger callback with the error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;
	


describe( "Jobs" , function() {
	
	it( "can be an array of async function accepting a completion callback" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "can be an array of synchronous function, if it still accept and use the completion callback" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "can be an array of array, each of them having a async function as the first element and then a list of argument to pass to this function, it should accept one more argument: the callback for completion being added by the async lib" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "can be an array of array, each of them having a synchronous function as the first element and then a list of argument to pass to this function, if those functions still accept and use the completion callback" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ syncJob , stats , 0 , {} , [ undefined , 'my' ] ] ,
			[ syncJob , stats , 1 , {} , [ undefined , 'wonderful' ] ] ,
			[ syncJob , stats , 2 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "can be an array of async.Plan, each of them will be used by calling their .exec() method" , function( done ) {
		
		var stats = createStats( 6 ) ;
		
		async.parallel( [
			async.series( [
				[ asyncJob , stats , 0 , 10 , {} , [ undefined , 'a' ] ] ,
				[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'nice' ] ] ,
				[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'output' ] ]
			] ) ,
			async.series( [
				[ asyncJob , stats , 3 , 10 , {} , [ undefined , 'my' ] ] ,
				[ asyncJob , stats , 4 , 10 , {} , [ undefined , 'wonderful' ] ] ,
				[ asyncJob , stats , 5 , 10 , {} , [ undefined , 'result' ] ]
			] )
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results[ 0 ][ 0 ] ).not.to.be.an( Error ) ;
			expect( results[ 1 ][ 0 ] ).not.to.be.an( Error ) ;
			expect( results[ 0 ][ 1 ] ).to.eql( [ [ undefined , 'a' ], [ undefined , 'nice' ], [ undefined , 'output' ] ] ) ;
			expect( results[ 1 ][ 1 ] ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 3, 1, 4, 2, 5 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "can be an array that mix all those type of jobs" , function( done ) {
		
		var stats = createStats( 7 ) ;
		
		async.parallel( [
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
			async.series( [
				[ asyncJob , stats , 2 , 20 , {} , [ undefined , 'nested' ] ] ,
				[ asyncJob , stats , 3 , 20 , {} , [ undefined , 'async.Plan' ] ] ,
				[ asyncJob , stats , 4 , 20 , {} , [ undefined , 'results' ] ]
			] ) ,
			[ syncJob , stats , 5 , {} , [ undefined , "I'm a synchronous array of function and arguments" ] ] ,
			[ asyncJob , stats , 6 , 10 , {} , [ undefined , "I'm an async array of function and arguments" ] ] ,
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [
				[ undefined , "I'm an async anonymous function" ] ,
				[ undefined , "I'm a synchronous anonymous function" ] ,
				[ undefined , [ [ undefined , "nested" ] , [ undefined , "async.Plan" ] , [ undefined , "results" ] ] ] ,
				[ undefined , "I'm a synchronous array of function and arguments" ] ,
				[ undefined , "I'm an async array of function and arguments" ]
			] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1, 1, 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 1, 5, 0, 6, 2, 3, 4 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "objects can be used instead of array as the top container, the results should be an objects with the same properties mapping, properties' order should be preserved (*IF* they do not start with a digit - because of V8 behaviours with objects)" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( {
			one: [ asyncJob , stats , 0 , 40 , {} , [ undefined , 'my' ] ] ,
			two: [ asyncJob , stats , 1 , 20 , {} , [ undefined , 'wonderful' ] ] ,
			three: [ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( { one: [ undefined , 'my' ], two: [ undefined , 'wonderful' ], three: [ undefined , 'result' ] } ) ;
			expect( Object.keys( results ) ).to.eql( [ 'one' , 'two' , 'three' ] ) ;	// Check the keys order
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "Jobs & async.Plan.prototype.using()" , function() {
	
	describe( "passing a function to .using()" , function() {
		
		it( "should take each job as an array of arguments to pass to the .using()'s function" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.do( [
				[ stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
				[ stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
				[ stats , 2 , 0 , {} , [ undefined , 'result' ] ]
			] )
			.using( asyncJob )
			.exec( function( error , results ) {
				expect( error ).not.to.be.an( Error ) ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "when the job is not an array, it should take each job as the first argument to pass to the .using()'s function" , function( done ) {
			
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
				expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
	
	describe( "passing an array to .using()" , function() {
		
		it( "when a job is a function, it should take the .using()'s array as argument" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.parallel( [
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
				expect( results ).to.eql( [
					[ undefined , 'DESCRIPTION: some data' ] ,
					[ undefined , 'LENGTH: 12' ] ,
					[ undefined , 'BODY: blahblihblah' ]
				] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
} ) ;



describe( "Jobs scheduling with async.prototype.nice()" , function() {
	
	it( "using .nice( -2 ), it should run the series of job with synchonous scheduling" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( -2 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using .nice( -1 ), it should run the series of job with an async scheduling (setImmediate)" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( -1 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using .nice( 10 ), it should run the series of job with an async scheduling (setTimeout 100ms)" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( 10 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using .nice( -2 ), it should run the jobs in parallel with synchonous scheduling" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( -2 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using .nice( -1 ), it should run the jobs in parallel with an async scheduling (setImmediate)" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( -1 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using .nice( 10 ), it should run the jobs in parallel with an async scheduling (setTimeout 100ms)" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.nice( 10 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "Jobs & async.Plan.prototype.execMapping(), adding input arguments to .exec()" , function() {
	
	it( "using default exec()'s arguments mapping, called with no argument, it should not throw error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			function( callback ) {
				var id = 2 ;
				stats.startCounter[ id ] ++ ;
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , "result" ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
					done() ;
				} , 0 ) ;
			}
		] )
		.exec() ;
	} ) ;
	
	it( "using default exec()'s arguments mapping, when a job is a function, it should take the input arguments passed to .exec()" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
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
			expect( results ).to.eql( [
				[ undefined , 'DESCRIPTION: some data' ] ,
				[ undefined , 'LENGTH: 12' ] ,
				[ undefined , 'BODY: blahblihblah' ]
			] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a job is a function, it should take the input arguments passed to .exec()" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
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
		.execMapping( { callbacks: [ 'finally' ] , minInputs: 2 , maxInputs: 2 , inputsName: [ 'describe' , 'body' ] } )
		.exec( 'some data' , 'blahblihblah' , function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [
				[ undefined , 'DESCRIPTION: some data' ] ,
				[ undefined , 'LENGTH: 12' ] ,
				[ undefined , 'BODY: blahblihblah' ]
			] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when mixing arguments passed to .exec() and .using(), .exec()'s arguments overlapping .using()'s arguments should overwrite" , function( done ) {
		
		var stats ;
		
		var asyncPlan = async.parallel( [
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
		.execMapping( { callbacks: [ 'finally' ] , minInputs: 0 , maxInputs: 2 , inputsName: [ 'describe' , 'body' ] } ) ;
		
		stats = createStats( 3 ) ;
		
		asyncPlan.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [
				[ undefined , "DESCRIPTION: <insert .using()'s description here>" ] ,
				[ undefined , 'LENGTH: 29' ] ,
				[ undefined , "BODY: <insert .using()'s body here>" ]
			] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
			
			stats = createStats( 3 ) ;
			
			asyncPlan.exec( "<insert .exec()'s description here>" , function( error , results ) {
				expect( error ).not.to.be.an( Error ) ;
				expect( results ).to.eql( [
					[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
					[ undefined , 'LENGTH: 29' ] ,
					[ undefined , "BODY: <insert .using()'s body here>" ]
				] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
				
				stats = createStats( 3 ) ;
				
				asyncPlan.exec( "<insert .exec()'s description here>" , "<insert .exec()'s body here>" , function( error , results ) {
					expect( error ).not.to.be.an( Error ) ;
					expect( results ).to.eql( [
						[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
						[ undefined , 'LENGTH: 28' ] ,
						[ undefined , "BODY: <insert .exec()'s body here>" ]
					] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
					expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
					done() ;
				} ) ;
			} ) ;
		} ) ;
	} ) ;
} ) ;



describe( "*this*" , function() {
	
	it( "each job function should have *this* set to the current jobContext, jobCallback.jobContext should be an alternate way to access it" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			function( callback ) {
				var id = 0 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				expect( this.execContext.results ).to.eql( [ undefined ] ) ;
				stats.startCounter[ id ] ++ ;
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'my' ) ;
				} , 0 ) ;
			} ,
			function( callback ) {
				var id = 1 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				expect( this.execContext.results ).to.eql( [ [ undefined , 'my' ] , undefined ] ) ;
				stats.startCounter[ id ] ++ ;
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'wonderful' ) ;
				} , 0 ) ;
			} ,
			function( callback ) {
				var id = 2 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				expect( this.execContext.results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], undefined ] ) ;
				stats.startCounter[ id ] ++ ;
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'result' ) ;
				} , 0 ) ;
			}
		] )
		.exec( done ) ;
	} ) ;
	
	it( "using()'s function should have *this* set to the current jobContext" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ 0 , 'my' , [ undefined ] ] ,
			[ 1 , 'wonderful' , [ [ undefined , 'my' ] , undefined ] ] ,
			[ 2 , 'result' , [ [ undefined , 'my' ], [ undefined , 'wonderful' ], undefined ] ]
		] )
		.using( function( id , result , expectedThisResults , callback ) {
			expect( this ).to.be.an( async.JobContext ) ;
			expect( callback.jobContext ).to.be( this ) ;
			expect( this.execContext ).to.be.an( async.ExecContext ) ;
			expect( this.execContext.results ).to.eql( expectedThisResults ) ;
			stats.startCounter[ id ] ++ ;
			setTimeout( function() {
				stats.endCounter[ id ] ++ ;
				stats.order.push( id ) ;
				callback( undefined , result ) ;
			} , 0 ) ;
		} )
		.exec( done ) ;
	} ) ;
	
	it( "every user provided callback should have *this* set to the current execContext" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.then( function( results ) {
			expect( this ).to.be.an( async.ExecContext ) ;
			expect( this.results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		} )
		.finally( function( error , results ) {
			expect( this ).to.be.an( async.ExecContext ) ;
			expect( this.results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		} )
		.execThenCatch(
			function( results ) {
				expect( this ).to.be.an( async.ExecContext ) ;
				expect( this.results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			} ,
			function( error ) {} ,
			function( error , results ) {
				expect( this ).to.be.an( async.ExecContext ) ;
				expect( this.results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "a job can register to the 'timeout' event, that will be triggered when using .timeout() when the job exceed the time limit" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var timeoutArray = [ false , false , false ] ;
		
		async.parallel( [
			function( callback ) {
				var id = 0 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				stats.startCounter[ id ] ++ ;
				
				this.on( 'timeout' , function() {
					timeoutArray[ id ] = true ;
				} ) ;
				
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'my' ) ;
				} , 20 ) ;
			} ,
			function( callback ) {
				var id = 1 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				stats.startCounter[ id ] ++ ;
				
				this.on( 'timeout' , function() {
					timeoutArray[ id ] = true ;
				} ) ;
				
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'wonderful' ) ;
				} , 60 ) ;
			} ,
			function( callback ) {
				var id = 2 ;
				expect( this ).to.be.an( async.JobContext ) ;
				expect( callback.jobContext ).to.be( this ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				stats.startCounter[ id ] ++ ;
				
				this.on( 'timeout' , function() {
					timeoutArray[ id ] = true ;
				} ) ;
				
				setTimeout( function() {
					stats.endCounter[ id ] ++ ;
					stats.order.push( id ) ;
					callback( undefined , 'result' ) ;
				} , 0 ) ;
			}
		] )
		.timeout( 40 )
		.exec( function( error , results ) {
			expect( error ).to.be.ok() ;
			expect( results ).to.eql( [ [ undefined, 'my' ] , [ new async.AsyncError( 'jobTimeout' ) ] , [ undefined, 'result' ] ] ) ;
			expect( timeoutArray ).to.be.eql( [ false , true , false ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "JobContext.abort()" , function() {
	
	it( "should start a series of sync job, one of them call this.abort(), so it should abort the whole job's queue" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ syncJob , stats , 0 , {} , [ undefined , 'my' ] ] ,
			[ syncJob , stats , 1 , { abort: true } , [ undefined , 'wonderful' ] ] ,
			[ syncJob , stats , 2 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should start a series of async job, one of them call this.abort(), so it should abort the whole job's queue" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 50 , { abort: true } , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "a job within a while loop, calling this.abort(), cannot abort the whole loop" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var count = -1 ;
		
		async.while( function( error , results , callback ) {
			count ++ ;
			callback( count < 3 ) ;
		} )
		.do( [
			function( callback ) {
				stats.startCounter[ count ] ++ ;
				stats.endCounter[ count ] ++ ;
				stats.order.push( count ) ;
				if ( count === 1 ) { this.abort( undefined , count ) ; }
				else { callback( undefined , count ) ; }
			}
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined, 2 ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should run a job within a while loop, one of them call this.abortLoop(), so it should abort the whole loop" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var count = -1 ;
		
		async.while( function( error , results , callback ) {
			count ++ ;
			callback( count < 3 ) ;
		} )
		.do( [
			function( callback ) {
				stats.startCounter[ count ] ++ ;
				stats.endCounter[ count ] ++ ;
				stats.order.push( count ) ;
				if ( count === 1 ) { this.abortLoop( undefined , count ) ; }
				else { callback( undefined , count ) ; }
			}
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined, 1 ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "ExecContext.getJobsStatus()" , function() {

	it( "should return the real-time status of all jobs at any time (here in series mode)" , function( done ) {
		
		async.series( [
			function one( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( undefined , 'ok' ) ;
				} , 20 ) ;
			} ,
			function two( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( new Error( 'somethingBadHappens' ) ) ;
				} , 20 ) ;
			} ,
			function three( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'failed' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( undefined , 'should timeout!' ) ;
				} , 60 ) ;
			} ,
			function four( callback ) {
				var self = this , jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'failed' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'timeout' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					self.abort() ;
				} , 0 ) ;
			} ,
			function five( callback ) {
				expect().fail( "This code should never be reached" ) ;
			}
		] )
		.timeout( 40 )
		.fatal( false )
		.exec( function( error , results ) {
			
			var jobsStatus = this.getJobsStatus() ;
			
			expect( error ).not.to.be.ok() ;
			
			expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
			expect( jobsStatus[ 1 ].status ).to.be( 'failed' ) ;
			expect( jobsStatus[ 2 ].status ).to.be( 'timeout' ) ;
			expect( jobsStatus[ 3 ].status ).to.be( 'aborted' ) ;
			expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
			
			done() ;
		} ) ;
	} ) ;

	it( "should return the real-time status of all jobs at any time (here in parallel mode)" , function( done ) {
		
		async.parallel( [
			function one( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( undefined , 'ok' ) ;
				} , 20 ) ;
			} ,
			function two( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( new Error( 'somethingBadHappens' ) ) ;
				} , 20 ) ;
			} ,
			function three( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'waiting' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					callback( undefined , 'should timeout!' ) ;
				} , 60 ) ;
			} ,
			function four( callback ) {
				var self = this , jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'waiting' ) ;
				
				setTimeout( function() {
					self.abort() ;
				} , 30 ) ;
			} ,
			function five( callback ) {
				var jobsStatus = this.execContext.getJobsStatus() ;
				
				expect( this ).to.be.an( async.JobContext ) ;
				expect( this.execContext ).to.be.an( async.ExecContext ) ;
				
				expect( jobsStatus[ 0 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 1 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 2 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 3 ].status ).to.be( 'pending' ) ;
				expect( jobsStatus[ 4 ].status ).to.be( 'pending' ) ;
			}
		] )
		.timeout( 40 )
		.fatal( false )
		.exec( function( error , results ) {
			
			var jobsStatus = this.getJobsStatus() ;
			
			expect( error ).not.to.be.ok() ;
			
			expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
			
			expect( jobsStatus[ 1 ].status ).to.be( 'failed' ) ;
			
			// Sometime 'timeout' kick in before execThen(), but it should be considered as a normal behaviour
			//expect( jobsStatus[ 2 ].status ).to.be( 'pending' ) ;
			expect( [ 'pending' , 'timeout' ] ).to.contain( jobsStatus[ 2 ].status ) ;
			
			expect( jobsStatus[ 3 ].status ).to.be( 'aborted' ) ;
			
			// Same here
			//expect( jobsStatus[ 4 ].status ).to.be( 'pending' ) ;
			expect( [ 'pending' , 'timeout' ] ).to.contain( jobsStatus[ 4 ].status ) ;
			
			done() ;
		} ) ;
	} ) ;
	
	it( "should report the number of retry of a job, as well as the list of successives errors" , function( done ) {
		
		var jobOneTries = 1 , jobTwoTries = 1 ;
		
		async.parallel( [
			function one( callback ) {
				setTimeout( function() {
					if ( jobOneTries < 6 ) { callback( new Error( 'somethingBadHappens' + jobOneTries ) ) ; }
					else { callback( undefined , 'ok' ) ; }
					jobOneTries ++ ;
				} , 20 ) ;
			} ,
			function two( callback ) {
				setTimeout( function() {
					if ( jobTwoTries < 2 ) { callback( new Error( 'somethingBadHappens' + jobTwoTries ) ) ; }
					else { callback( undefined , 'ok' ) ; }
					jobTwoTries ++ ;
				} , 20 ) ;
			}
		] )
		.retry( 3 , 5 )
		.exec( function( error , results ) {
			
			var jobsStatus = this.getJobsStatus() ;
			//console.log( jobsStatus ) ;
			
			expect( error ).to.be.ok() ;
			
			expect( jobsStatus[ 0 ].status ).to.be( 'failed' ) ;
			expect( jobsStatus[ 0 ].tried ).to.be( 4 ) ;
			expect( jobsStatus[ 0 ].errors.length ).to.be( 4 ) ;
			expect( jobsStatus[ 0 ].errors[ 0 ].message ).to.be( 'somethingBadHappens1' ) ;
			expect( jobsStatus[ 0 ].errors[ 1 ].message ).to.be( 'somethingBadHappens2' ) ;
			expect( jobsStatus[ 0 ].errors[ 2 ].message ).to.be( 'somethingBadHappens3' ) ;
			expect( jobsStatus[ 0 ].errors[ 3 ].message ).to.be( 'somethingBadHappens4' ) ;
			expect( jobsStatus[ 0 ].result ).to.eql( [ new Error( 'somethingBadHappens4' ) ] ) ;
			
			expect( jobsStatus[ 1 ].status ).to.be( 'ok' ) ;
			expect( jobsStatus[ 1 ].tried ).to.be( 2 ) ;
			expect( jobsStatus[ 1 ].errors.length ).to.be( 1 ) ;
			expect( jobsStatus[ 1 ].errors[ 0 ].message ).to.be( 'somethingBadHappens1' ) ;
			expect( jobsStatus[ 1 ].result ).to.eql( [ undefined, 'ok' ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should give insight when a job call its callback twice or more" , function( done ) {
	
		async.parallel( [
			function one( callback ) {
				setTimeout( function() {
					callback( undefined , 'ok' ) ;
					callback( undefined , 'callback used twice' ) ;
					callback( undefined , 'callback used three times' ) ;
				} , 20 ) ;
			} ,
			function two( callback ) {
				setTimeout( function() {
					callback( undefined , 'ok' ) ;
				} , 20 ) ;
			}
		] )
		.exec( function( error , results ) {
			
			var jobsStatus = this.getJobsStatus() ;
			//console.log( jobsStatus ) ;
			
			expect( error ).not.to.be.ok() ;
			
			expect( jobsStatus[ 0 ].status ).to.be( 'ok' ) ;
			expect( jobsStatus[ 0 ].tried ).to.be( 1 ) ;
			expect( jobsStatus[ 0 ].errors.length ).to.be( 2 ) ;
			expect( jobsStatus[ 0 ].errors[ 0 ].message ).to.be( 'This job has called its completion callback 2 times' ) ;
			expect( jobsStatus[ 0 ].errors[ 1 ].message ).to.be( 'This job has called its completion callback 3 times' ) ;
			expect( jobsStatus[ 0 ].result ).to.eql( [ undefined , 'ok' ] ) ;
			
			expect( jobsStatus[ 1 ].status ).to.be( 'ok' ) ;
			expect( jobsStatus[ 1 ].tried ).to.be( 1 ) ;
			expect( jobsStatus[ 1 ].errors.length ).to.be( 0 ) ;
			expect( jobsStatus[ 1 ].result ).to.eql( [ undefined, 'ok' ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.foreach()" , function() {
	
	it( "should take each job as an element to pass to the iterator function" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		var myArray = [
			{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
			{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
			{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
		] ;
		
		async.foreach( myArray , function( element , callback ) {
			
			stats.startCounter[ element.id ] ++ ;
			
			setTimeout( function() {
				stats.endCounter[ element.id ] ++ ;
				stats.order.push( element.id ) ;
				callback.apply( undefined , element.result ) ;
			} , element.delay ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the *iterator* accepts three arguments, the current key (array's index) is passed to it as the second argument" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		var myArray = [
			{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
			{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
			{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
		] ;
		
		async.foreach( myArray , function( element , key , callback ) {
			
			stats.startCounter[ element.id ] ++ ;
			expect( key ).to.equal( element.id ) ;
			
			setTimeout( function() {
				stats.endCounter[ element.id ] ++ ;
				stats.order.push( element.id ) ;
				callback.apply( undefined , element.result ) ;
			} , element.delay ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "if the container to iterate is an object, the current key (property name) is passed to it as the second argument" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		var myObject = {
			one: { id: 0 , name: 'one' , timeout: 10 , result: [ undefined , 'my' ] } ,
			two: { id: 1 , name: 'two' , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
			three: { id: 2 , name: 'three' , timeout: 0 , result: [ undefined , 'result' ] }
		} ;
		
		async.foreach( myObject , function( element , key , callback ) {
			
			stats.startCounter[ element.id ] ++ ;
			expect( key ).to.equal( element.name ) ;
			
			setTimeout( function() {
				stats.endCounter[ element.id ] ++ ;
				stats.order.push( element.id ) ;
				callback.apply( undefined , element.result ) ;
			} , element.delay ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( { one: [ undefined , 'my' ], two: [ undefined , 'wonderful' ], three: [ undefined , 'result' ] } ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the *iterator* accepts (at least) four arguments, the whole job's array or object is passed to it as the third argument" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		var myArray = [
			{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
			{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
			{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
		] ;
		
		async.foreach( myArray , function( element , key , array , callback ) {
			
			stats.startCounter[ element.id ] ++ ;
			expect( key ).to.equal( element.id ) ;
			expect( array ).to.eql( myArray ) ;
			
			setTimeout( function() {
				stats.endCounter[ element.id ] ++ ;
				stats.order.push( element.id ) ;
				callback.apply( undefined , element.result ) ;
			} , element.delay ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "if a job fails, it should continue anyway processing others" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		var myArray = [
			{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
			{ id: 1 , timeout: 0 , result: [ new Error() , 'wonderful' ] } ,
			{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
		] ;
		
		async.foreach( myArray , function( element , callback ) {
			
			stats.startCounter[ element.id ] ++ ;
			
			setTimeout( function() {
				stats.endCounter[ element.id ] ++ ;
				stats.order.push( element.id ) ;
				callback.apply( undefined , element.result ) ;
			} , element.delay ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.map()" , function() {
	
	it( "should take each job as an element to pass to the iterator function, and create a new array with computed values and 1:1 mapping" , function( done ) {
		
		var myArray = [ 'my' , 'wonderful' , 'result' ] ;
		
		async.map( myArray , function( element , callback ) {
			
			setTimeout( function() {
				callback( undefined , element.length ) ;
			} , 0 ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ 2, 9, 6 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should take each job of an object as an element to pass to the iterator function, and create a new object with computed values and 1:1 mapping" , function( done ) {
		
		var myObject = { one: 'my' , two: 'wonderful' , three: 'result' } ;
		
		async.map( myObject , function( element , callback ) {
			
			setTimeout( function() {
				callback( undefined , element.length ) ;
			} , 0 ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( { one: 2, two: 9, three: 6 } ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the *iterator* accepts (at least) three arguments, the current key (array's index) is passed to it as the second argument" , function( done ) {
		
		var myArray = [ 'my' , 'wonderful' , 'result' ] ;
		var count = 0 ;
		
		async.map( myArray , function( element , key , callback ) {
			
			expect( key ).to.equal( count ) ;
			count ++ ;
			
			setTimeout( function() {
				callback( undefined , element.length ) ;
			} , 0 ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ 2, 9, 6 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "if the container to iterate is an object, the current key (property name) is passed to it as the second argument" , function( done ) {
		
		var myObject = { my: 'my' , wonderful: 'wonderful' , result: 'result' } ;
		
		async.map( myObject , function( element , key , callback ) {
			
			expect( key ).to.equal( element ) ;
			
			setTimeout( function() {
				callback( undefined , element.length ) ;
			} , 0 ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( { my: 2, wonderful: 9, result: 6 } ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.reduce()" , function() {
	
	it( "should take each job as an element to pass to the iterator function, and trigger callback with an aggregated value" , function( done ) {
		
		var myArray = [ 'my' , 'wonderful' , 'result' ] ;
		
		async.reduce( myArray , 5 , function( aggregate , element , callback ) {
			
			setTimeout( function() {
				callback( undefined , aggregate + element.length ) ;
			} , 0 ) ;
		} )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( 22 ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "if a default initial aggregate value is not supplied to async.reduce(), this initial value should be supplied as exec()'s first argument by default" , function( done ) {
		
		var myArray = [ 'my' , 'wonderful' , 'result' ] ;
		
		var plan = async.reduce( myArray , function( aggregate , element , callback ) {
			
			setTimeout( function() {
				callback( undefined , aggregate + element.length ) ;
			} , 0 ) ;
		} )
		.exec( 7 , function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( 24 ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.waterfall()" , function() {
	
	it( "should run the series of job in waterfall mode: each job received the result of the previous, the final result is the result of the last job, the first job receive arguments from exec(), if any" , function( done ) {
		
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
			expect( results ).to.equal( 'oh my wonderful result' ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "using async.Plan.prototype.transmitError(), each job received the full list of arguments transmited by the previous job, including the error argument taht is truncated by default" , function( done ) {
		
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
			expect( results ).to.equal( 'oh my wonderful result' ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.race()" , function() {
	
	it( "should run parallel racing jobs, and should trigger the callback after the fastest job complete, with the winning job's results only" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.race( [
			[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.equal( 'wonderful' ) ;
			expect( stats.endCounter ).to.eql( [ 0, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when some jobs have errors, it should return after the fastest successful job, other failed results are discarded" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.race( [
			[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.equal( 'result' ) ;
			expect( stats.endCounter ).to.eql( [ 0, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when all jobs have errors, it should return an error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.race( [
			[ asyncJob , stats , 0 , 100 , {} , [ new Error() , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ new Error() , 'result' ] ]
		] )
		.exec( function( error , results ) {
			expect( error ).to.be.an( Error ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 1, 2, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when using a parallel limit, no new jobs should be processed after a job complete without error" , function( done ) {
		
		var stats = createStats( 4 ) ;
		
		async.race( [
			[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'again' ] ]
		] )
		.parallel( 3 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.equal( 'wonderful' ) ;
			expect( stats.startCounter ).to.eql( [ 1, 1, 1, 0 ] ) ;
			expect( stats.endCounter ).to.eql( [ 0, 1, 0, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.while()" , function() {
	
	it( "while the while()'s callback's result is true, it should run jobs in series (by default), and do it again and again, the final result contains only the last iteration" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( whileCount ).to.equal( 4 ) ;
			expect( stats.endCounter ).to.eql( [ 3, 3, 3 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the while()'s callback has an error, no more iteration are performed, the last iteration results are transmitted, but the error in the while is transmitted as well" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( whileCount ).to.equal( 4 ) ;
			expect( stats.endCounter ).to.eql( [ 3, 3, 3 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when using async.Plan.prototype.parallel(), it should run jobs in parallel, and start a new iteration only when all jobs in the current iteration have been completed, other behaviour are the same like in series" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( whileCount ).to.equal( 4 ) ;
			expect( stats.endCounter ).to.eql( [ 3, 3, 3 ] ) ;
			expect( stats.order ).to.eql( [ 1, 2, 0, 1, 2, 0, 1, 2, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when the first call to while()'s callback's result is false, no jobs are even started, and the final result is empty" , function( done ) {
		
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
			expect( results ).to.eql( [] ) ;
			expect( whileCount ).to.equal( 1 ) ;
			expect( stats.endCounter ).to.eql( [ 0, 0, 0 ] ) ;
			expect( stats.order ).to.eql( [] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.do().while()" , function() {
	
	it( "should work the same way as async.while() except that the while()'s callback's is evaluated at the end of the loop" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( whileCount ).to.equal( 4 ) ;
			expect( stats.endCounter ).to.eql( [ 4, 4, 4 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "so even if the first call to while()'s callback's result is false, the first iteration is already done" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( whileCount ).to.equal( 1 ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.do().repeat()" , function() {
	
	it( "should repeat the action the given time" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
		] )
		.repeat( 4 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 4, 4, 4 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "Async conditional" , function() {
	
	describe( "async.if.and()" , function() {
		
		it( "should evaluate async truthy && truthy && truthy to true, and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async truthy && falsy && truthy to false, and run just the first and second jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async falsy && falsy && falsy to false, and run just the first job" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
		
	describe( "async.if.or()" , function() {
		
		it( "should evaluate async truthy || truthy || truthy to true, and run only the first jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async falsy || truthy || falsy to true, and run just the first and second jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async falsy || falsy || falsy to false, and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
	
	describe( "async.and()" , function() {
		
		it( "should evaluate async true && 7 && 'wonderful' to 'wonderful', and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( 'wonderful' ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async true && 0 && 'wonderful' to 0, and run just the first and second jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 0 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( 0 ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async undefined && null && false to undefined, and run just the first job" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( undefined ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
		
	describe( "async.or()" , function() {
		
		it( "should evaluate async 7 || true || 'wonderful' to 7, and run only the first jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ true ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( 7 ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async undefined || 7 || false to 7, and run just the first and second jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( 7 ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async undefined || null || '' to '', and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.or( [
				[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
				[ asyncJob , stats , 2 , 0 , {} , [ '' ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( '' ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
		
	describe( "nested async.or() and async.and() in async.if()" , function() {
		
		it( "should evaluate async ( truthy || falsy ) && truthy to true, and run first and third jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.and( [
				async.or( [
					[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
					[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
				] ) ,
				[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async ( falsy || truthy ) && falsy to false, and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.and( [
				async.or( [
					[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
					[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
				] ) ,
				[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async ( truthy && falsy ) || truthy to true, and run all jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.or( [
				async.and( [
					[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
					[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
				] ) ,
				[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "should evaluate async ( falsy && truthy ) || falsy to false, and run the first and third jobs" , function( done ) {
			
			var stats = createStats( 3 ) ;
			
			async.if.or( [
				async.and( [
					[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
					[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
				] ) ,
				[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
			] )
			.exec( function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
	
	describe( "async.Plan.prototype.boolean()" , function() {
		
		it( "should force async.and()'s result to be a boolean, so 'wonderful' && 7 should evaluate to true" , function( done ) {
			
			var stats = createStats( 2 ) ;
			
			async.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
			] )
			.boolean()
			.exec( function( result ) {
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
		
		it( "using .boolean( false ), it should force async.if.and()'s result to preserve the last evaluated value (the javascript way), so 'wonderful' && 7 should evaluate to 7" , function( done ) {
			
			var stats = createStats( 2 ) ;
			
			async.if.and( [
				[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
				[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
			] )
			.boolean( false )
			.exec( function( result ) {
				expect( result ).to.equal( 7 ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1 ] ) ;
				done() ;
			} ) ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.then(), .else(), .catch(), .finally(), .execThenCatch(), .execThenElse() and .execThenElseCatch()" , function() {
	
	it( "should run a series of successful jobs and trigger in-plan and in-exec then() and finally()" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.then( function( results ) {
			stats.plan.then ++ ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
		} )
		.catch( function( error , results ) {
			stats.plan.catch ++ ;
			done( new Error( "Should not trigger catch()" ) ) ;
		} )
		.finally( function( error , results ) {
			stats.plan.finally ++ ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
		} )
		.execThenCatch(
			function( results ) {
				stats.exec.then ++ ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			} ,
			function( error , results ) {
				stats.exec.catch ++ ;
				done( new Error( "Should not trigger catch()" ) ) ;
			} ,
			function( error , results ) {
				expect( error ).not.to.be.an( Error ) ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
				expect( stats.plan.then ).to.equal( 1 ) ;
				expect( stats.plan.catch ).to.equal( 0 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 1 ) ;
				expect( stats.exec.catch ).to.equal( 0 ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "should run a series of jobs, interrupted by an error, and trigger in-plan and in-exec catch() and finally()" , function( done ) {
		
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
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
		} )
		.finally( function( error , results ) {
			stats.plan.finally ++ ;
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1 ] ) ;
		} )
		.execThenCatch(
			function( results ) {
				stats.exec.then ++ ;
				done( new Error( "Should not trigger then()" ) ) ;
			} ,
			function( error , results ) {
				stats.exec.catch ++ ;
				expect( error ).to.be.an( Error ) ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1 ] ) ;
			} ,
			function( error , results ) {
				expect( error ).to.be.an( Error ) ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1 ] ) ;
				expect( stats.plan.then ).to.equal( 0 ) ;
				expect( stats.plan.catch ).to.equal( 1 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 0 ) ;
				expect( stats.exec.catch ).to.equal( 1 ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "should evaluate async truthy && truthy && truthy to true, and trigger in-plan and in-exec then() and finally()" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.if.and( [
			[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
		] )
		.then( function( result ) {
			stats.plan.then ++ ;
			expect( result ).to.equal( true ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
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
			expect( result ).to.equal( true ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
		} )
		.execThenElseCatch(
			function( result ) {
				stats.exec.then ++ ;
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
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
				expect( result ).to.equal( true ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.plan.then ).to.equal( 1 ) ;
				expect( stats.plan.else ).to.equal( 0 ) ;
				expect( stats.plan.catch ).to.equal( 0 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 1 ) ;
				expect( stats.exec.else ).to.equal( 0 ) ;
				expect( stats.exec.catch ).to.equal( 0 ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "should evaluate async truthy && falsy && truthy to false, and trigger in-plan and in-exec else() and finally()" , function( done ) {
		
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
			expect( result ).to.equal( false ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
		} )
		.catch( function( error ) {
			stats.plan.catch ++ ;
			done( new Error( "Should not trigger catch()" ) ) ;
		} )
		.finally( function( result ) {
			stats.plan.finally ++ ;
			expect( result ).to.equal( false ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
		} )
		.execThenElseCatch(
			function( result ) {
				stats.exec.then ++ ;
				done( new Error( "Should not trigger then()" ) ) ;
			} ,
			function( result ) {
				stats.exec.else ++ ;
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			} ,
			function( error ) {
				stats.exec.catch ++ ;
				done( new Error( "Should not trigger catch()" ) ) ;
			} ,
			function( result ) {
				expect( result ).to.equal( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.plan.then ).to.equal( 0 ) ;
				expect( stats.plan.else ).to.equal( 1 ) ;
				expect( stats.plan.catch ).to.equal( 0 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 0 ) ;
				expect( stats.exec.else ).to.equal( 1 ) ;
				expect( stats.exec.catch ).to.equal( 0 ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "should evaluate async truthy && Error && truthy to Error, and trigger in-plan and in-exec catch() and finally()" , function( done ) {
		
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
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
		} )
		.finally( function( result ) {
			stats.plan.finally ++ ;
			expect( result ).to.be.an( Error ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
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
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			} ,
			function( result ) {
				expect( result ).to.be.an( Error ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.plan.then ).to.equal( 0 ) ;
				expect( stats.plan.else ).to.equal( 0 ) ;
				expect( stats.plan.catch ).to.equal( 1 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 0 ) ;
				expect( stats.exec.else ).to.equal( 0 ) ;
				expect( stats.exec.catch ).to.equal( 1 ) ;
				done() ;
			}
		) ;
	} ) ;
	
	it( "when there isn't any catch() and a job has an error, it should trigger in-plan and in-exec else() and finally()" , function( done ) {
		
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
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
		} )
		.finally( function( result ) {
			stats.plan.finally ++ ;
			expect( result ).to.be( false ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
		} )
		.execThenElse(
			function( result ) {
				stats.exec.then ++ ;
				done( new Error( "Should not trigger then()" ) ) ;
			} ,
			function( result ) {
				stats.exec.else ++ ;
				expect( result ).to.be( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
			} ,
			function( result ) {
				expect( result ).to.be( false ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.plan.then ).to.equal( 0 ) ;
				expect( stats.plan.else ).to.equal( 1 ) ;
				expect( stats.plan.finally ).to.equal( 1 ) ;
				expect( stats.exec.then ).to.equal( 0 ) ;
				expect( stats.exec.else ).to.equal( 1 ) ;
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.timeout()" , function() {
	
	it( "should abort job in a series that take too much time to complete, its result should be an error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.timeout( 20 )
		.exec( function( error , results ) {
			expect( error ).to.be.an( async.AsyncError ) ;
			expect( error ).to.be.an( Error ) ;	// ensure that async.AsyncError is an instance of Error
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ new async.AsyncError( 'jobTimeout' ) ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
			expect( stats.order ).to.eql( [ 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should abort job in a parallel flow that take too much time to complete, its result should be an error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.timeout( 20 )
		.exec( function( error , results ) {
			expect( error ).to.be.an( async.AsyncError ) ;
			expect( error ).to.be.an( Error ) ;	// ensure that async.AsyncError is an instance of Error
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ new async.AsyncError( 'jobTimeout' ) ] , [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.retry()" , function() {
	
	it( "should retry a series of job with failure the good amount of time, in the good order, then succeed and return the good results" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
		] )
		.retry( 10 , 5 )
		.exec( function( error , results ) {
			//console.log( arguments ) ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 4, 6, 3 ] ) ;
			expect( stats.order ).to.eql( [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should retry parallel jobs with failure the good amount of time, then succeed and return the good results" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
		] )
		.retry( 10 , 5 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 4, 6, 3 ] ) ;
			// stats.order is not relevant here
			done() ;
		} ) ;
	} ) ;
	
	it( "should retry many times, and evaluate async falsy || falsy || truthy to true" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.or( [
			[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , false ] ] ,
			[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 0 ] ] ,
			[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'wonderful' ] ]
		] )
		.retry( 10 )
		.exec( function( result ) {
			expect( result ).to.equal( 'wonderful' ) ;
			expect( stats.endCounter ).to.eql( [ 4, 6, 3 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should retry many times, and evaluate async truthy && truthy && truthy to true" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.and( [
			[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , true ] ] ,
			[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 7 ] ] ,
			[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'wonderful' ] ]
		] )
		.retry( 10 )
		.exec( function( result ) {
			expect( result ).to.equal( 'wonderful' ) ;
			expect( stats.endCounter ).to.eql( [ 4, 6, 3 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "Mixing async.Plan.prototype.retry() & async.Plan.prototype.timeout()" , function() {
	
	it( "when a job timeout and is still pending, it should be retried, if the second try complete before, it transmit its result" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
			function( callback ) {
				var timeout , result ;
				
				stats.startCounter[ 1 ] ++ ;
				timeout = 0 ;
				
				switch ( stats.startCounter[ 1 ] )
				{
					case 1 :
						result = '1st' ;
						timeout = 100 ;
						break ;
					case 2 :
						result = '2nd' ;
						break ;
					case 3 :
						result = '3rd' ;
						break ;
					default :
						result = '' + stats.startCounter[ 1 ] + 'th' ;
						break ;
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
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ undefined , '2nd' ] , [ undefined , 'result' ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 2, 1 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "be careful when mixing .timeout() and .retry(), if a job timeout and retry, the first try may finally complete before others tries, so it should return the result of the first try to complete without error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
			function( callback ) {
				var timeout , result ;
				
				stats.startCounter[ 1 ] ++ ;
				timeout = 75 ;
				
				switch ( stats.startCounter[ 1 ] )
				{
					case 1 :
						result = '1st' ;
						break ;
					case 2 :
						result = '2nd' ;
						break ;
					case 3 :
						result = '3rd' ;
						break ;
					default :
						result = '' + stats.startCounter[ 1 ] + 'th' ;
						break ;
				}
				
				setTimeout( function() {
					stats.endCounter[ 1 ] ++ ;
					stats.order.push( 1 ) ;
					callback( undefined , result ) ;
				} , timeout ) ;
			} ,
			[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
		] )
		.timeout( 30 )
		.retry( 5 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ undefined , '1st' ] , [ undefined , 'result' ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 3, 1 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when a job's first try timeout, a second try kick in, and then the first try finish with an error before the second try complete, the second try result is used" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
			function( callback ) {
				var timeout , error , result ;
				
				stats.startCounter[ 1 ] ++ ;
				timeout = 50 ;
				error = undefined ;
				
				switch ( stats.startCounter[ 1 ] )
				{
					case 1 :
						result = '1st' ;
						error = new Error( "Failed!" ) ;
						break ;
					//case 1 : result = '1st' ; break ;
					case 2 :
						result = '2nd' ;
						break ;
					case 3 :
						result = '3rd' ;
						break ;
					default :
						result = '' + stats.startCounter[ 1 ] + 'th' ;
						break ;
				}
				
				setTimeout( function() {
					stats.endCounter[ 1 ] ++ ;
					stats.order.push( 1 ) ;
					callback( error , result ) ;
				} , timeout ) ;
			} ,
			[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
		] )
		.timeout( 40 )
		.retry( 1 )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ] , [ undefined , '2nd' ] , [ undefined , 'result' ] ] ) ;
			expect( stats.startCounter ).to.eql( [ 1, 2, 1 ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 2, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.parallel()" , function() {
	
	it( "should run parallel jobs, with a limit of jobs running at a time" , function( done ) {
		
		var stats = createStats( 6 ) ;
		
		async.parallel( [
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
			expect( results ).to.eql( [ [ undefined, 'one' ], [ undefined, 'two' ], [ undefined, 'three' ], [ undefined, 'four' ], [ undefined, 'five' ], [ undefined, 'six' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 1, 3, 2, 5, 4, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.fatal()" , function() {
	
	it( "should run the series of job and continue on error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.do( [
			[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
		] )
		.fatal( false )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should run parallel jobs and continue on error" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
		] )
		.fatal( false )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 1, 2, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.lastJobOnly()" , function() {
	
	it( "should run the series of job and pass only the results of the last job" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.lastJobOnly()
		.exec( function() {
			var args = Array.prototype.slice.call( arguments ) ;
			expect( args ).to.eql( [ undefined , 'result' ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "should run jobs in parallel and pass only the results of the last job - can produce random result with parallel mode!" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.lastJobOnly()
		.exec( function() {
			var args = Array.prototype.slice.call( arguments ) ;
			expect( args ).to.eql( [ undefined , 'wonderful' ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.mapping1to1()" , function() {
	
	it( "the results should map one to one the job's list, any extra arguments passed to the job's callback should be ignored" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' , 'extra argument that will be dropped' ] ]
		] )
		.mapping1to1()
		.exec( function( error , results ) {
			expect( results ).to.eql( [ 'my' , 'wonderful' , 'result' ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
	
	it( "when using an object as the job's list, the result is an object mapping one to one the job's list" , function( done ) {
		
		var stats = createStats( 3 ) ;
		
		async.parallel( {
			one: [ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			two: [ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			three: [ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' , 'extra argument that will be dropped' ] ]
		} )
		.mapping1to1()
		.exec( function( error , results ) {
			expect( results ).to.eql( { one: 'my' , two: 'wonderful' , three: 'result' } ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 2, 0, 1 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "async.Plan.prototype.execKV()" , function() {
	
	it( "should pass an object with inputs arguments in 'inputs' property and 'then' & 'finally' callback in properties of the same name" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var then ;
		
		async.parallel( [
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
		.execKV( {
			inputs: [ 'some data' , 'blahblihblah' ],
			then: function( results ) {
				then = true ;
				expect( results ).to.eql( [
					[ undefined , 'DESCRIPTION: some data' ] ,
					[ undefined , 'LENGTH: 12' ] ,
					[ undefined , 'BODY: blahblihblah' ]
				] ) ;
			} ,
			'finally': function( error , results ) {
				expect( error ).not.to.be.an( Error ) ;
				expect( then ).to.equal( true ) ;
				expect( results ).to.eql( [
					[ undefined , 'DESCRIPTION: some data' ] ,
					[ undefined , 'LENGTH: 12' ] ,
					[ undefined , 'BODY: blahblihblah' ]
				] ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
				expect( stats.order ).to.eql( [ 2, 1, 0 ] ) ;
				done() ;
			}
		} ) ;
	} ) ;
	
	it( "should accept 'catch' callback in the 'catch' property" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var then , catch_ ;
		
		async.series( [
			[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
		] )
		.execKV( {
			inputs: [ 'some data' , 'blahblihblah' ],
			then: function( results ) {
				then = true ;
			} ,
			'catch': function( results ) {
				catch_ = true ;
			} ,
			'finally': function( error , results ) {
				expect( error ).to.be.an( Error ) ;
				expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
				expect( stats.order ).to.eql( [ 0, 1 ] ) ;
				expect( then ).to.not.be.equal( true ) ;
				expect( catch_ ).to.equal( true ) ;
				expect( results ).to.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
				done() ;
			}
		} ) ;
	} ) ;
	
	it( "should accept the aggegate property as well" , function( done ) {
		
		var myArray = [ 'my' , 'wonderful' , 'result' ] ;
		var then ;
		
		async.reduce( myArray , 5 , function( aggregate , element , callback ) {
			
			setTimeout( function() {
				callback( undefined , aggregate + element.length ) ;
			} , 0 ) ;
		} )
		.execKV( {
			aggregate: 11,
			'then': function( results ) {
				then = true ;
				expect( results ).to.eql( 28 ) ;
			} ,
			'finally': function( error , results ) {
				expect( error ).not.to.be.an( Error ) ;
				expect( then ).to.equal( true ) ;
				expect( results ).to.eql( 28 ) ;
				done() ;
			}
		} ) ;
	} ) ;
} ) ;



describe( "Events" , function() {
	
	it( "should trigger a 'progress' event after each jobs of a series complete, the 'resolved' event triggers callbacks, the 'finish' event should be triggered after all callbacks and 'progress' event" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var finallyTriggered = false ;
		var resolvedTriggered = false ;
		
		var context = async.series( [
			[ asyncJob , stats , 0 , 10 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
		] )
		.nice( 0 )
		.exec( function( error , results ) {
			finallyTriggered = true ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
		} ) ;
		
		expect( context ).to.be.an( async.ExecContext ) ;
		
		var progressCount = 0 ;
		
		context.on( 'progress' , function( progressStatus , error , results ) {
			
			progressCount ++ ;
			expect( error ).not.to.be.an( Error ) ;
			
			switch ( progressCount )
			{
				case 1 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 1, ok: 1, failed: 0, pending: 0, waiting: 2 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], undefined ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
					expect( stats.order ).to.eql( [ 0 ] ) ;
					break ;
				case 2 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 2, ok: 2, failed: 0, pending: 0, waiting: 1 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], undefined ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 0 ] ) ;
					expect( stats.order ).to.eql( [ 0, 1 ] ) ;
					break ;
				case 3 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 3, ok: 3, failed: 0, pending: 0, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
					break ;
				default :
					throw new Error( 'progress event received too much time' ) ;
			}
		} ) ;
		
		context.on( 'resolved' , function( error , results ) {
			resolvedTriggered = true ;
			expect( progressCount ).to.be( 2 ) ; // resolved is triggered before the last 'progress' event
			expect( finallyTriggered ).to.be( true ) ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
		} ) ;
		
		context.on( 'finish' , function( error , results ) {
			expect( progressCount ).to.be( 3 ) ;
			expect( finallyTriggered ).to.be( true ) ;
			expect( resolvedTriggered ).to.be( true ) ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} ) ;
		
	} ) ;
	
	it( "should trigger a 'progress' event after each jobs of a parallel batch complete, the 'resolved' event triggers callbacks, the 'finish' event should be triggered after all callbacks and 'progress' event" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var finallyTriggered = false ;
		var resolvedTriggered = false ;
		
		var context = async.parallel( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
		] )
		.nice( 0 )
		.exec( function( error , results ) {
			finallyTriggered = true ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
		} ) ;
		
		expect( context ).to.be.an( async.ExecContext ) ;
		
		var progressCount = 0 ;
		
		context.on( 'progress' , function( progressStatus , error , results ) {
			
			progressCount ++ ;
			expect( error ).not.to.be.an( Error ) ;
			
			switch ( progressCount )
			{
				case 1 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 1, ok: 1, failed: 0, pending: 2, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], undefined, undefined ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
					expect( stats.order ).to.eql( [ 0 ] ) ;
					break ;
				case 2 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 2, ok: 2, failed: 0, pending: 1, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], undefined, [ undefined , 'result' ] ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 2 ] ) ;
					break ;
				case 3 :
					expect( progressStatus ).to.eql( { loop: 0, resolved: 3, ok: 3, failed: 0, pending: 0, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
					break ;
				default :
					throw new Error( 'progress event received too much time' ) ;
			}
		} ) ;
		
		context.on( 'resolved' , function( error , results ) {
			resolvedTriggered = true ;
			expect( progressCount ).to.be( 2 ) ; // resolved is triggered before the last 'progress' event
			expect( finallyTriggered ).to.be( true ) ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
		} ) ;
		
		context.on( 'finish' , function( error , results ) {
			expect( progressCount ).to.be( 3 ) ;
			expect( finallyTriggered ).to.be( true ) ;
			expect( resolvedTriggered ).to.be( true ) ;
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
			done() ;
		} ) ;
		
	} ) ;
	
	it( "in parallel mode, when an error occurs the 'resolved' event is triggered, however if another job is running, the 'finish' event is triggered only when it is done" , function( done ) {
		
		var stats = createStats( 3 ) ;
		var finallyTriggered = false ;
		var resolvedTriggered = false ;
		
		var context = async.parallel( [
			[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
			[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
			[ asyncJob , stats , 2 , 50 , {} , [ new Error() ] ]
		] )
		.nice( 0 )
		.exec( function( error , results ) {
			finallyTriggered = true ;
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], undefined, [ new Error() ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2 ] ) ;
		} ) ;
		
		expect( context ).to.be.an( async.ExecContext ) ;
		
		var progressCount = 0 ;
		
		context.on( 'progress' , function( progressStatus , error , results ) {
			
			progressCount ++ ;
			
			switch ( progressCount )
			{
				case 1 :
					expect( error ).not.to.be.an( Error ) ;
					expect( progressStatus ).to.eql( { loop: 0, resolved: 1, ok: 1, failed: 0, pending: 2, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], undefined, undefined ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 0, 0 ] ) ;
					expect( stats.order ).to.eql( [ 0 ] ) ;
					break ;
				case 2 :
					expect( error ).to.be.an( Error ) ;
					expect( progressStatus ).to.eql( { loop: 0, resolved: 2, ok: 1, failed: 1, pending: 1, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], undefined, [ new Error() ] ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 2 ] ) ;
					break ;
				case 3 :
					expect( error ).to.be.an( Error ) ;
					expect( progressStatus ).to.eql( { loop: 0, resolved: 3, ok: 2, failed: 1, pending: 0, waiting: 0 } ) ;
					expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ new Error() ] ] ) ;
					expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
					expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
					break ;
				default :
					throw new Error( 'progress event received too much time' ) ;
			}
		} ) ;
		
		context.on( 'resolved' , function( error , results ) {
			resolvedTriggered = true ;
			expect( progressCount ).to.be( 1 ) ; // resolved is triggered before the last 'progress' event
			expect( finallyTriggered ).to.be( true ) ;
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], undefined, [ new Error() ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 0, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2 ] ) ;
		} ) ;
		
		context.on( 'finish' , function( error , results ) {
			expect( progressCount ).to.be( 3 ) ;
			expect( finallyTriggered ).to.be( true ) ;
			expect( resolvedTriggered ).to.be( true ) ;
			expect( error ).to.be.an( Error ) ;
			expect( results ).to.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ new Error() ] ] ) ;
			expect( stats.endCounter ).to.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.eql( [ 0, 2, 1 ] ) ;
			done() ;
		} ) ;
		
	} ) ;
} ) ;



describe( "async.callTimeout()" , function() {
	
	it( "should perform a call with timeout which will succeed in time and another one which will timeout, argument and this context should be passed correctly" , function( done ) {
		
		var completionCallback1 = function( error , result ) {
			expect( error ).not.to.be.ok() ;
			expect( result ).to.be( 'ok: hello world' ) ;
		} ;
		
		var completionCallback2 = function( error , result ) {
			expect( error ).to.be.ok() ;
			expect( error ).to.be.an( Error ) ;
			expect( error.message ).to.be( 'jobTimeout' ) ;
			done() ;
		} ;
		
		var object = {
			prop: "property" ,
			fn: function( arg1 , arg2 , t , callback ) {
				expect( this ).to.be.an( Object ) ;
				expect( this.prop ).to.be( "property" ) ;
				
				setTimeout( function() { callback( undefined , 'ok: ' + arg1 + ' ' + arg2 ) ; } , t ) ;
			}
		} ;
		
		async.callTimeout( 20 , completionCallback1 , object.fn , object , 'hello' , 'world' , 10 ) ;
		async.callTimeout( 20 , completionCallback2 , object.fn , object , 'hello' , 'world' , 30 ) ;
	} ) ;
	
} ) ;



describe( "async.wrapper.timeout()" , function() {
	
	it( "should create a wrapper around an asynchronous function, that call automatically the callback with an error after a predefined time (and also ensure the callback is called only once)" , function( done ) {
		
		var object = {
			prop: "property" ,
			fn: function( arg1 , arg2 , t , callback ) {
				expect( this ).to.be.an( Object ) ;
				expect( this.prop ).to.be( "property" ) ;
				
				setTimeout( function() { callback( undefined , 'ok: ' + arg1 + ' ' + arg2 ) ; } , t ) ;
			}
		} ;
		
		object.fnWrapper = async.wrapper.timeout( object.fn , 20 ) ;
		
		object.fnWrapper( 'hello' , 'world' , 10 , function( error , result ) {
			expect( error ).not.to.be.ok() ;
			expect( result ).to.be( 'ok: hello world' ) ;
		} ) ;
		
		object.fnWrapper( 'hello' , 'world' , 30 , function( error , result ) {
			expect( error ).to.be.ok() ;
			expect( error ).to.be.an( Error ) ;
			expect( error.message ).to.be( 'Timeout' ) ;
			done() ;
		} ) ;
	} ) ;
	
} ) ;



describe( "Misc tests" , function() {
	
	it( "should trigger the callback even if no job is provided (empty array)" , function( done ) {
		
		async.series( [] )
		.exec( function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.eql( [] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;



describe( "'Maximum call stack size exceeded' prevention" , function() {
	
	it( "nice -20 (the new default) should call setImmediate() once every 19 recursive synchronous calls" , function( done ) {
		
		this.timeout( 3000 ) ;
		
		var i , array = [] ;
		
		for ( i = 0 ; i <= 10000 ; i ++ ) { array[ i ] = i ; }
		
		async.foreach( array , function( element , k , foreachCallback ) {
			//if ( k % 100 === 0 ) { console.log( 'k:' , k ) ; }
			foreachCallback() ;
		} )
		.nice( -20 )
		.exec( function() {
			done() ;
		} ) ;
	} ) ;
} ) ;



if ( ! async.isBrowser )
{
	describe( "async.exit()" , function() {
		
		it( "async.exit()" )
	} ) ;
}



}).call(this,require('_process'))
},{"../lib/async.js":1,"../lib/browser.js":2,"_process":14,"expect.js":6}],10:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; i++) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  that.write(string, encoding)
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

function arrayIndexOf (arr, val, byteOffset, encoding) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var foundIndex = -1
  for (var i = 0; byteOffset + i < arrLength; i++) {
    if (read(arr, byteOffset + i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
      if (foundIndex === -1) foundIndex = i
      if (i - foundIndex + 1 === valLength) return (byteOffset + foundIndex) * indexSize
    } else {
      if (foundIndex !== -1) i -= i - foundIndex
      foundIndex = -1
    }
  }
  return -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  if (Buffer.isBuffer(val)) {
    // special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(this, val, byteOffset, encoding)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset, encoding)
  }

  throw new TypeError('val must be string, number or Buffer')
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; i++) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; i++) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":11,"ieee754":12,"isarray":13}],11:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],12:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],13:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],14:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[9]);
