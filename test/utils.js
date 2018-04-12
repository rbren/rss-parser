"use strict";
const utils = require("../lib/utils");
var Expect = require('chai').expect;

describe("Utils", function() {
    it('detect xml proper encoding', function(done){        
        Expect(utils.getXmlEncoding("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>")).to.equal("latin1");
        done();
      });
});