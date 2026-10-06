"""Produce a single offline HTML editor from the editable source files."""
from pathlib import Path
import json
p=Path(__file__).resolve().parent
core=(p/'core.js').read_text()
assets='window.FLOW_ASSETS='+ (p/'assets.json').read_text()+';\nwindow.FLOW_CORE_SOURCE='+json.dumps(core)+';\n'
(p/'assets-data.js').write_text(assets)
html=(p/'index.html').read_text()
for sheet in ['styles.css','screens.css']:
 html=html.replace('<link rel="stylesheet" href="'+sheet+'">','<style>'+(p/sheet).read_text()+'</style>')
for name,source in [('assets-data.js',assets),('core.js',core),('app.js',(p/'app.js').read_text()),('domain.js',(p/'domain.js').read_text()),('screens.js',(p/'screens.js').read_text())]:
 html=html.replace('<script src="'+name+'"></script>','<script>'+source.replace('</script','<\\/script')+'</script>')
(p.parent/'Flow-Studio.html').write_text(html)
print('Built Flow-Studio.html:',len(html.encode()),'bytes')
