#!/usr/bin/env python3
"""Genera public/fm-081.xlsx (plantilla del PDT, formato FM-081) a partir de un PDT diligenciado.

Uso: python3 scripts/preparar-plantilla-pdt.py "<PDT de ejemplo>.xlsx"

Conserva el formato (estilos, celdas combinadas, logos) y quita lo propio del ejemplo: datos del cliente, puntos, parámetros,
el mapa, la vista previa y las cadenas de texto que ya no se usan. La app llena el resto en el navegador (src/exportar/pdt.ts).
"""
import re, sys, zipfile

BLOQUES_VACIOS = list(range(18, 45)) + list(range(54, 60)) + list(range(61, 66)) + list(range(67, 71))
CELDAS_VACIAS = {6: 'CH', 7: 'CH', 8: 'CH', 9: 'CH', 11: 'B', 13: 'C', 15: 'F'}  # datos del ejemplo (cliente, objetivo, marcas X)
ULTIMA_FILA, ULTIMA_COL = 81, 14  # N: las columnas siguientes están ocultas
AJUSTAR_TEXTO = (29, 37, 38, 62, 63, 66, 67)  # estilos de las tablas de parámetros que no partían el texto largo en varias líneas

def col_n(letras):
    n = 0
    for c in letras: n = n * 26 + ord(c) - 64
    return n

def main(origen, destino='public/fm-081.xlsx'):
    z = zipfile.ZipFile(origen)
    hoja = z.read('xl/worksheets/sheet1.xml').decode('utf8')
    ini, fin = hoja.index('<sheetData>') + 11, hoja.index('</sheetData>')
    filas = re.findall(r'<row r="(\d+)"([^>]*?)(?:/>|>(.*?)</row>)', hoja[ini:fin], flags=re.S)
    nuevas = []
    for n, attrs, cuerpo in filas:
        n = int(n)
        if n > ULTIMA_FILA: continue
        celdas = []
        for ref, a, resto in re.findall(r'<c r="([A-Z]+\d+)"([^>]*?)(?:/>|>(.*?)</c>)', cuerpo or '', flags=re.S):
            col = re.match(r'[A-Z]+', ref).group(0)
            if col_n(col) > ULTIMA_COL: continue
            vaciar = n in BLOQUES_VACIOS or col in CELDAS_VACIAS.get(n, '')
            if vaciar: a, resto = re.sub(r'\s+t="[^"]*"', '', a), ''
            celdas.append(f'<c r="{ref}"{a}/>' if not resto else f'<c r="{ref}"{a}>{resto}</c>')
        attrs = re.sub(r'\s+hidden="1"', '', attrs)
        nuevas.append(f'<row r="{n}"{attrs}>{"".join(celdas)}</row>' if celdas else f'<row r="{n}"{attrs}/>')
    hoja = hoja[:ini] + ''.join(nuevas) + hoja[fin:]
    hoja = re.sub(r'<dimension ref="[^"]*"/>', f'<dimension ref="A1:N{ULTIMA_FILA}"/>', hoja)
    hoja = hoja.replace('topLeftCell="A62" ', '').replace('activeCell="C8" sqref="C8:F8"', 'activeCell="A1" sqref="A1"')

    # Cadenas de texto: solo las que siguen en uso
    sst = z.read('xl/sharedStrings.xml').decode('utf8')
    items = re.findall(r'<si>.*?</si>', sst, flags=re.S)
    usados = sorted({int(v) for v in re.findall(r'<c [^>]*t="s"[^>]*><v>(\d+)</v>', hoja)})
    nuevo_idx = {v: i for i, v in enumerate(usados)}
    hoja = re.sub(r'(<c [^>]*t="s"[^>]*><v>)(\d+)(</v>)', lambda m: m.group(1) + str(nuevo_idx[int(m.group(2))]) + m.group(3), hoja)
    total = len(re.findall(r't="s"', hoja))
    sst_nuevo = (sst[:sst.index('<sst')] + re.search(r'<sst[^>]*>', sst).group(0)
                 .replace(re.search(r'count="\d+"', sst).group(0), f'count="{total}"')
                 .replace(re.search(r'uniqueCount="\d+"', sst).group(0), f'uniqueCount="{len(usados)}"')
                 + ''.join(items[i] for i in usados) + '</sst>')

    # Estilos: las celdas de las tablas de parámetros deben partir el texto largo
    estilos = z.read('xl/styles.xml').decode('utf8')
    a, b = estilos.index('<cellXfs'), estilos.index('</cellXfs>')
    xfs = re.findall(r'<xf [^>]*?(?:/>|>.*?</xf>)', estilos[a:b], flags=re.S)
    for i in AJUSTAR_TEXTO:
        xfs[i] = re.sub(r'<alignment ([^>]*?)(?<!wrapText="1")/>', lambda m: f'<alignment {m.group(1)} wrapText="1"/>', xfs[i])
    estilos = estilos[:a] + re.match(r'<cellXfs[^>]*>', estilos[a:b]).group(0) + ''.join(xfs) + estilos[b:]

    # Dibujo: sin el mapa del ejemplo (la imagen que usa rId3)
    dib = z.read('xl/drawings/drawing1.xml').decode('utf8')
    dib = re.sub(r'<xdr:twoCellAnchor.*?r:embed="rId3".*?</xdr:twoCellAnchor>', '', dib, flags=re.S)
    rels_dib = re.sub(r'<Relationship Id="rId3"[^>]*/>', '', z.read('xl/drawings/_rels/drawing1.xml.rels').decode('utf8'))
    libro = z.read('xl/workbook.xml').decode('utf8')
    libro = re.sub(r'<mc:AlternateContent.*?</mc:AlternateContent>', '', libro, flags=re.S)
    libro = libro.replace("'EA-146-25'!", 'PDT!').replace('name="EA-146-25"', 'name="PDT"')
    libro = libro.replace('$A$1:$AJ$81', f'$A$1:$N${ULTIMA_FILA}')
    app = z.read('docProps/app.xml').decode('utf8').replace('EA-146-25', 'PDT')
    rels = re.sub(r'<Relationship Id="rId2"[^>]*thumbnail[^>]*/>', '', z.read('_rels/.rels').decode('utf8'))
    tipos = z.read('[Content_Types].xml').decode('utf8').replace('<Default Extension="emf" ContentType="image/x-emf"/>', '')

    cambios = {'xl/styles.xml': estilos, 'xl/worksheets/sheet1.xml': hoja, 'xl/sharedStrings.xml': sst_nuevo, 'xl/drawings/drawing1.xml': dib,
               'xl/drawings/_rels/drawing1.xml.rels': rels_dib, 'xl/workbook.xml': libro, 'docProps/app.xml': app,
               '_rels/.rels': rels, '[Content_Types].xml': tipos}
    quitar = {'xl/media/image3.png', 'docProps/thumbnail.emf'}
    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as out:
        for info in z.infolist():
            if info.filename in quitar: continue
            out.writestr(info.filename, cambios[info.filename].encode('utf8') if info.filename in cambios else z.read(info.filename))
    print(destino, 'listo;', len(usados), 'cadenas en uso')

if __name__ == '__main__': main(*sys.argv[1:])
