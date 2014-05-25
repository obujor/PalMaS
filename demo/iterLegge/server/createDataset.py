#!/usr/bin/env python3

from SPARQLWrapper import SPARQLWrapper, JSON
import sys
import json
import os.path

results = {
    "commissioni" : [],
    "ddl": []
}

def cleanData(data):
    rows = []
    for result in data["results"]["bindings"]:
        row = {};
        for field in result:
            row[field] = result[field]['value']
        rows.append(row)
    return rows

def getAssegnazioniByFaseNr(assegnazioni, faseNr):
    rows = list(filter(lambda x: x["nomeFase"] == faseNr, assegnazioni))
    groups = {}
    for row in rows:
        date = row["dataAssegnazione"]
        if date not in groups:
            groups[date] = []
        row.pop("dataAssegnazione", None)
        groups[date].append(row)
        
    for date in groups:
        commissioni = []
        for commissione in groups[date]:
            try:
                index = results["commissioni"].index(commissione["label"])
            except:
                index = len(results["commissioni"])
                results["commissioni"].append(commissione["label"])
            commissioni.append(index)
        groups[date] = commissioni
    return groups
 

def downloadAssegnazioniOffset(legislatura, offset):
    query = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT ?nomeFase ?dataAssegnazione ?label
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
        ?fase osr:fase ?nomeFase.
        ?ddl osr:legislatura %d.
    }
    OFFSET %d""" % (legislatura, offset)

    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    return cleanData(sparql.query().convert())
    
def downloadAssegnazioni(legislatura):
    assegnazioni = []
    maxResults = 10000
    query = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT count(?assegnazione) AS ?numAssegnazioni
    WHERE
    {
        ?ddl a osr:Ddl.
        ?iter a osr:IterDdl.
        ?ddl osr:idDdl ?idDdl.
        ?iter osr:idDdl ?idDdl.
        ?iter osr:fase ?faseIter.
        ?faseIter osr:ddl ?fase.
        ?fase osr:assegnazione ?assegnazione.
        ?ddl osr:legislatura %d.
    }""" % (legislatura,)

    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = cleanData(sparql.query().convert())

    numAssegnazioni = int(results[0]["numAssegnazioni"])
    for i in range((numAssegnazioni//maxResults)+1):
        assegnazioni = assegnazioni + downloadAssegnazioniOffset(legislatura, i*maxResults)
        
    return assegnazioni

	
def downloadAllDdl(legislatura):
    counter = 0
    query = """PREFIX osr: <http://dati.senato.it/osr/>
	SELECT DISTINCT ?stato ?dataPresentazione ?titolo ?fase ?idfase ?progressivoIter ?idddl ?ramo ?natura ?numeroFase ?dataStato
	{
		?ddl a osr:Ddl; osr:legislatura %d; osr:statoDdl ?stato; osr:dataStatoDdl ?dataStato; osr:dataPresentazione ?dataPresentazione;
		osr:titolo ?titolo; osr:fase ?fase; osr:idFase ?idfase; osr:progressivoIter ?progressivoIter; osr:idDdl ?idddl;
		osr:ramo ?ramo; osr:natura ?natura; osr:numeroFase ?numeroFase.
	}""" % (legislatura,)

    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    
    assegnazioni = downloadAssegnazioni(legislatura)
    
    rows = cleanData(results)
    
    for row in rows:
        row["assegnazioni"] = getAssegnazioniByFaseNr(assegnazioni, row["fase"])
    return rows

def writeToFile(data, filePath):
    with open(filePath, 'w') as outfile:
        json.dump(data, outfile, ensure_ascii=False)
    
if len(sys.argv) > 2:
    LEGISLATURA=int(sys.argv[1])
    OUTPUTFILE=sys.argv[2]
else:
    print("Usage: createDataset.py legislatura outputFile")
    exit()

print("Scaricamento legislatura %s" % (LEGISLATURA,))

sparql = SPARQLWrapper("http://dati.senato.it/sparql")

results["ddl"] = downloadAllDdl(LEGISLATURA)
results["legislatura"] = LEGISLATURA

writeToFile(results, OUTPUTFILE)
