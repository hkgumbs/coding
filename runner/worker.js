const fs = require("fs");
const proc = require("child_process");
const util = require("util");
const locks = require("locks");

const mutex = locks.createMutex();
const lock = x => new Promise((resolve, reject) => x.lock(() => resolve()));
const shell = x => util.promisify(proc.exec)(x).then(y => y.stdout.trim());

const toHtml = js => `
<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="UTF-8">
    <style>/*! wysiwyg.css v0.0.3 | MIT License | github.com/jgthms/wysiwyg.css */.wysiwyg{line-height:1.6}.wysiwyg a{text-decoration:none}.wysiwyg a:hover{border-bottom:1px solid}.wysiwyg abbr{border-bottom:1px dotted;cursor:help}.wysiwyg cite{font-style:italic}.wysiwyg hr{background:#e6e6e6;border:none;display:block;height:1px;margin-bottom:1.4em;margin-top:1.4em}.wysiwyg img{vertical-align:text-bottom}.wysiwyg ins{background-color:lime;text-decoration:none}.wysiwyg mark{background-color:#ff0}.wysiwyg small{font-size:0.8em}.wysiwyg strong{font-weight:700}.wysiwyg sub,.wysiwyg sup{font-size:0.8em}.wysiwyg sub{vertical-align:sub}.wysiwyg sup{vertical-align:super}.wysiwyg p,.wysiwyg dl,.wysiwyg ol,.wysiwyg ul,.wysiwyg blockquote,.wysiwyg pre,.wysiwyg table{margin-bottom:1.4em}.wysiwyg p:last-child,.wysiwyg dl:last-child,.wysiwyg ol:last-child,.wysiwyg ul:last-child,.wysiwyg blockquote:last-child,.wysiwyg pre:last-child,.wysiwyg table:last-child{margin-bottom:0}.wysiwyg p:empty{display:none}.wysiwyg h1,.wysiwyg h2,.wysiwyg h3,.wysiwyg h4,.wysiwyg h5,.wysiwyg h6{font-weight:700;line-height:1.2}.wysiwyg h1:first-child,.wysiwyg h2:first-child,.wysiwyg h3:first-child,.wysiwyg h4:first-child,.wysiwyg h5:first-child,.wysiwyg h6:first-child{margin-top:0}.wysiwyg h1{font-size:2.4em;margin-bottom:.58333em;margin-top:.58333em;line-height:1}.wysiwyg h2{font-size:1.6em;margin-bottom:.875em;margin-top:1.75em;line-height:1.1}.wysiwyg h3{font-size:1.3em;margin-bottom:1.07692em;margin-top:1.07692em}.wysiwyg h4{font-size:1.2em;margin-bottom:1.16667em;margin-top:1.16667em}.wysiwyg h5{font-size:1.1em;margin-bottom:1.27273em;margin-top:1.27273em}.wysiwyg h6{font-size:1em;margin-bottom:1.4em;margin-top:1.4em}.wysiwyg dd{margin-left:1.4em}.wysiwyg ol,.wysiwyg ul{list-style-position:outside;margin-left:1.4em}.wysiwyg ol{list-style-type:decimal}.wysiwyg ol ol{list-style-type:lower-alpha}.wysiwyg ol ol ol{list-style-type:lower-roman}.wysiwyg ol ol ol ol{list-style-type:lower-greek}.wysiwyg ol ol ol ol ol{list-style-type:decimal}.wysiwyg ol ol ol ol ol ol{list-style-type:lower-alpha}.wysiwyg ul{list-style-type:disc}.wysiwyg ul ul{list-style-type:circle}.wysiwyg ul ul ul{list-style-type:square}.wysiwyg ul ul ul ul{list-style-type:circle}.wysiwyg ul ul ul ul ul{list-style-type:disc}.wysiwyg ul ul ul ul ul ul{list-style-type:circle}.wysiwyg blockquote{border-left:4px solid #e6e6e6;padding:0.6em 1.2em}.wysiwyg blockquote p{margin-bottom:0}.wysiwyg code,.wysiwyg kbd,.wysiwyg samp,.wysiwyg pre{-moz-osx-font-smoothing:auto;-webkit-font-smoothing:auto;background-color:#f2f2f2;color:#333;font-size:0.9em}.wysiwyg code,.wysiwyg kbd,.wysiwyg samp{border-radius:3px;line-height:1.77778;padding:0.1em 0.4em 0.2em;vertical-align:baseline}.wysiwyg pre{overflow:auto;padding:1em 1.2em}.wysiwyg pre code{background:none;font-size:1em;line-height:1em}.wysiwyg figure{margin-bottom:2.8em;text-align:center}.wysiwyg figure:first-child{margin-top:0}.wysiwyg figure:last-child{margin-bottom:0}.wysiwyg figcaption{font-size:0.8em;margin-top:.875em}.wysiwyg table{width:100%}.wysiwyg table pre{white-space:pre-wrap}.wysiwyg th,.wysiwyg td{font-size:1em;padding:.7em;border:1px solid #e6e6e6;line-height:1.4}.wysiwyg thead tr,.wysiwyg tfoot tr{background-color:#f5f5f5}.wysiwyg thead th,.wysiwyg thead td,.wysiwyg tfoot th,.wysiwyg tfoot td{font-size:.9em;padding:.77778em}.wysiwyg thead th code,.wysiwyg thead td code,.wysiwyg tfoot th code,.wysiwyg tfoot td code{background-color:#fff}.wysiwyg tbody tr{background-color:#fff}</style>
    <script type="text/javascript">${js}</script>
  </head>
  <body class="wysiwyg"></body>
  <script type="text/javascript">Elm.Main.fullscreen();</script>
</html>
`;

exports.handler = async body => {
  const input = await shell("mktemp");
  const output = await shell("mktemp");
  await util.promisify(fs.writeFile)(input, body.elm);
  try {
    await lock(mutex);
    await shell(`elm-make --yes --output=${output}.js ${input}`);
    const js = await util.promisify(fs.readFile)(`${output}.js`, "utf8");
    return { id: body.id, output: toHtml(js) };
  } catch(e) {
    return { id: body.id, error: e.stderr.split(input).join("") };
  } finally {
    mutex.unlock();
  }
};
