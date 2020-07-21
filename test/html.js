"use strict";

var fs = require('fs');
var HTTP = require('http');

var utils = require('../lib/utils.js');

var Expect = require('chai').expect;

var IN_DIR = __dirname + '/input';
var OUT_DIR = __dirname + '/output';

describe('Utils', function() {
  it('should strip HTML appropriately', () => {
    var testCases = [{
      input: 'Hello world',
      output: 'Hello world',
    }, {
      input: '<h4>hi</h4>my name is',
      output: 'hi\nmy name is',
    }, {
      input: 'hello<br>world',
      output: 'hello\nworld',
    }, {
      input: 'hello<hr>world',
      output: 'hello\nworld',
    }, {
      input: 'hi<h3>my name is</h3>',
      output: 'hi\nmy name is',
    }, {
      input: 'hello<p>world</p>my<p>name is</p>',
      output: 'hello\nworld\nmy\nname is',
    }, {
      input: 'hello<span>my name is</span>',
      output: 'hellomy name is',
    }, {
      input: 'hello<span>&nbsp;</span>my name is &gt;',
      output: 'hello my name is >',
    }]
    testCases.forEach(tc => {
      Expect('|' + utils.getSnippet(tc.input) + '|').to.equal('|' + tc.output + '|', tc.input);
    });
  })
});

