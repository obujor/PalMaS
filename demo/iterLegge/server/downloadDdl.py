#!/usr/bin/env python3

from SPARQLWrapper import SPARQLWrapper, JSON
from datetime import datetime
import sys
import json

LEGISLATURA=17

def cleanData(data):
    rows = []
    for result in data["results"]["bindings"]:
        row = {};
        for field in result:
            row[field] = result[field]['value']
        rows.append(row)
    return rows

def getAssegnazioniByFaseNr(legislatura, faseNr):
    query = """
    PREFIX osr: <http://dati.senato.it/osr/>

    SELECT DISTINCT ?dataAssegnazione ?label
    WHERE
    {
        ?ddl a osr:Ddl.
        ?ddl osr:idDdl ?idDdl.
        ?iter a osr:IterDdl.
        ?iter osr:idDdl ?idDdl.
        ?iter osr:fase ?faseIter.
        ?faseIter osr:ddl ?fase.
        ?fase osr:numeroFase ?numeroFase.
        ?fase osr:assegnazione ?assegnazione.
        ?assegnazione osr:dataAssegnazione ?dataAssegnazione.
        ?assegnazione rdfs:label ?label.
        ?fase osr:fase "%s"^^<http://www.w3.org/2001/XMLSchema#string>.
        ?ddl osr:legislatura %s.
    }""" % (faseNr, legislatura)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    rows = cleanData(results)
    groups = {}
    for row in rows:
        date = row["dataAssegnazione"]
        if date not in groups:
            groups[date] = []
        row.pop("dataAssegnazione", None)
        groups[date].append(row)
    
    return groups
    
    
if len(sys.argv) > 2:
    FASE=sys.argv[1]
    OUTPUTFILE=sys.argv[2]
else:
    print("Usage: downdloadDdl.py nrFase outputFile")
    exit()

print("ELABORO FASE %s" % (FASE,))

sparql = SPARQLWrapper("http://dati.senato.it/sparql")

# ddl e legislatura
q_ddl_legislatura = """PREFIX osr: <http://dati.senato.it/osr/>
SELECT DISTINCT ?stato ?dataPresentazione ?titolo ?fase ?idfase ?progressivoIter ?idddl ?ramo ?natura ?numeroFase ?dataStato
{
    ?ddl a osr:Ddl; osr:legislatura %d; osr:statoDdl ?stato; osr:dataStatoDdl ?dataStato; osr:dataPresentazione ?dataPresentazione;
    osr:titolo ?titolo; osr:fase ?fase; osr:idFase ?idfase; osr:progressivoIter ?progressivoIter; osr:idDdl ?idddl;
    osr:ramo ?ramo; osr:natura ?natura; osr:numeroFase ?numeroFase.
    {
     SELECT DISTINCT ?idddl
    {
     ?ddl osr:legislatura %d; osr:fase "%s"^^<http://www.w3.org/2001/XMLSchema#string>; osr:idDdl ?idddl.
    }
  }
}""" % (LEGISLATURA, LEGISLATURA, FASE,)

sparql.setQuery(q_ddl_legislatura)
sparql.setReturnFormat(JSON)
results = sparql.query().convert()

rows = cleanData(results)

for row in rows:
    row["assegnazioni"] = getAssegnazioniByFaseNr(LEGISLATURA, row["fase"])

with open(OUTPUTFILE, 'w') as outfile:
     json.dump(rows, outfile, indent = 4, ensure_ascii=False)
