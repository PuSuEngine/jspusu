var fs = require("fs");

var DIST = "dist/";
var SOURCE = DIST + "commonjs/pusu.js";
var BROWSER = DIST + "pusu.js";

var commonjs = String(fs.readFileSync(SOURCE));

generate_browser(commonjs);

function generate_browser(sourceCode) {
    var header = String(fs.readFileSync("dist/browser/header.js"));
    var footer = String(fs.readFileSync("dist/browser/footer.js"));
    sourceCode = sourceCode.replace("exports.PuSu = PuSu;", "return PuSu;");

    var full = header + "\n" + sourceCode + "\n" + footer;

    fs.writeFileSync(BROWSER, full);
}
