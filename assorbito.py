import csv
import igraph as G
from SPARQLWrapper import SPARQLWrapper, JSON
from datetime import datetime
import sys
 
if len(sys.argv) > 1:
    LEGISLATURA=int(sys.argv[1])
else:
    LEGISLATURA=16

print "ELABORO LEGISLATURA %d" % (LEGISLATURA,)

sparql = SPARQLWrapper("http://dati.senato.it/sparql")

g = G.Graph(directed=True)

# ddl e legislatura
maxIdDdl = 0

Found = True

while Found:
    print "chunk offset %s" % (maxIdDdl)
    q_sequenza_fasi = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT ?idddl ?iterDdl ?progrFase ?codiceFase ?dataStato ?dataPresentazione
    {
    ?iterDdl a osr:IterDdl; osr:idDdl ?idddl; osr:fase ?fase.
    ?fase osr:progrIter ?progrFase; osr:ddl ?ddl.
    ?ddl osr:fase ?codiceFase; osr:dataStatoDdl ?dataStato; osr:dataPresentazione ?dataPresentazione;
    osr:legislatura %s.
    FILTER (?idddl > %s)
    }
    ORDER BY ?ddl ?progrFase
    """ % (LEGISLATURA,maxIdDdl)

    sparql.setQuery(q_sequenza_fasi)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()

    if results["results"]["bindings"]:
        print "GOT %d ROWS" % len(results["results"]["bindings"])
        for result in results["results"]["bindings"]:
            g.add_vertex(name=result['codiceFase']['value'],
                         idddl=result['idddl']['value'],
                         iterDdl=result['iterDdl']['value'],
                         progrFase=result['progrFase']['value'],
                         dataStato=result['dataStato']['value'],
                         dataPresentazione=result['dataPresentazione']['value']
                         )

        for iterDdl in set(g.vs['iterDdl']):
            fasiIter = g.vs(iterDdl=iterDdl)
            for i in range(len(fasiIter) - 1):
                fasePrec = fasiIter[i]
                faseSucc = fasiIter[i+1]
                g.add_edge(fasePrec, faseSucc, iterDdl=iterDdl)

        maxIdDdl = max(g.vs['idddl'])

    else:
        Found = False

q_assorbimento = """PREFIX osr: <http://dati.senato.it/osr/>
SELECT DISTINCT  ?codiceFaseAssorbito  ?codiceFaseAssorbente 
{
# tutte le relazioni di assorbimento
?iterDdl osr:assorbimento ?ddlAssorbito.

# info sul ddl che viene assorbito
?ddlAssorbito a osr:Ddl; osr:statoDdl ?statoDdl; osr:dataStatoDdl ?dataAssorbimento; osr:fase ?codiceFaseAssorbito;
osr:legislatura ?legislatura.

#qual è l'iter che assorbe
?iterDdl osr:idDdl ?idddl; osr:fase ?faseIterAssorbente.

?faseIterAssorbente osr:ddl ?ddlAssorbente.

?ddlAssorbente osr:dataStatoDdl ?dataAssorbimento; osr:fase ?codiceFaseAssorbente; osr:progressivoIter ?progrIterAssorbente.

# Potrebbero esserci più di un ddlAssorbente in base a quella data. Prendiamo quello con ProgressivoIter più basso
{
    SELECT ?iterDdl (MIN(?progrIterAssorbente) as ?progrIterAssorbente)
    {
            ?iterDdl osr:idDdl ?idddl; osr:fase ?faseIterAssorbente.
            ?faseIterAssorbente osr:ddl ?ddlAssorbente.
            ?ddlAssorbente osr:dataStatoDdl ?dataAssorbimento; osr:fase ?codiceFaseAssorbente; osr:progressivoIter ?progrIterAssorbente.
    }
}

FILTER  (?legislatura = %s).
}
""" % (LEGISLATURA,)

sparql.setQuery(q_assorbimento)
sparql.setReturnFormat(JSON)
results = sparql.query().convert()

for result in results["results"]["bindings"]:
    codiceFaseAssorbito  = result['codiceFaseAssorbito']['value']
    codiceFaseAssorbente = result['codiceFaseAssorbente']['value']
    print "%s->%s" % (codiceFaseAssorbito, codiceFaseAssorbente)
    vertexFrom = g.vs.find(name=codiceFaseAssorbito)
    vertexTo   = g.vs.find(name=codiceFaseAssorbente)
    g.add_edge(vertexFrom,vertexTo,tipo='assorbimento')


nodes=[{'name':v['name']} for v in g.vs]
links=[{'source':e.source,'target':e.target,'value':1.0} for e in g.es]

import json

output = {'nodes':nodes,'links':links}

with open('assorbito.json','w+') as f:
    json.dump(output,f)


