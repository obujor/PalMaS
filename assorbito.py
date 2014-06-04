#!/usr/bin/env python
# -*- coding: utf-8 -*-

import csv
import igraph as G
from SPARQLWrapper import SPARQLWrapper, JSON
from datetime import datetime
import sys



def add_assorbiti(g, LEGISLATURA, sparql):

    # ddl e legislatura
    maxIdDdl = -1
    idddlList=[]

    Found = True

    while Found:
        print "chunk offset %s" % (maxIdDdl)
        q_idddl = """PREFIX osr: <http://dati.senato.it/osr/>
        SELECT DISTINCT ?idddl
        {
        ?iterDdl a osr:IterDdl; osr:idDdl ?idddl.
        ?ddl a osr:Ddl; osr:idDdl ?idddl; osr:legislatura ?legislatura

        FILTER (?legislatura = %s)
        FILTER (?idddl > %s)
        }
        ORDER BY ?idddl
        LIMIT 1000
        """ % (LEGISLATURA,maxIdDdl)

        sparql.setQuery(q_idddl)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()

        if results["results"]["bindings"]:
            print "GOT %d ROWS" % len(results["results"]["bindings"])
            for result in results["results"]["bindings"]:
                idddlList.append(int(result['idddl']['value']))

            maxIdDdl = max(idddlList)

        else:
            Found = False

    #from IPython import embed; embed()

    CHUNK=1000
    idddlList = sorted(idddlList)
    while idddlList:
        idddlChunk = idddlList[:CHUNK]
        idddlList = idddlList[CHUNK:]
        minIdddl = min(idddlChunk)
        maxIdddl = max(idddlChunk)

        print "idddl [%s,%s]" % (minIdddl,maxIdddl)
        q_sequenza_fasi = """PREFIX osr: <http://dati.senato.it/osr/>
        SELECT DISTINCT ?idddl ?iterDdl ?progrFase ?codiceFase ?dataStato ?dataPresentazione ?titolo ?stato
        {
        ?iterDdl a osr:IterDdl; osr:idDdl ?idddl; osr:fase ?fase.
        ?fase osr:progrIter ?progrFase; osr:ddl ?ddl.
        ?ddl osr:fase ?codiceFase; osr:dataStatoDdl ?dataStato; osr:dataPresentazione ?dataPresentazione; osr:titolo ?titolo; osr:statoDdl ?stato; osr:legislatura ?legislatura.
        FILTER (?legislatura = %s)
        FILTER (?idddl >= %s AND ?idddl <= %s)
        }
        ORDER BY ?ddl ?progrFase
        """ % (LEGISLATURA,minIdddl, maxIdddl)

        sparql.setQuery(q_sequenza_fasi)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()

        if results["results"]["bindings"]:
            print "GOT %d ROWS" % len(results["results"]["bindings"])
            for result in results["results"]["bindings"]:
                nodeName=result['codiceFase']['value']
                if g.vcount() == 0 or len(g.vs.select(name = nodeName)) == 0:
                    print "ADD %s" % (nodeName, )
                    g.add_vertex(name = nodeName,
                                idddl=result['idddl']['value'],
                                iterDdl=result['iterDdl']['value'],
                                progrFase=result['progrFase']['value'],
                                dataStato=result['dataStato']['value'],
                                dataPresentazione=result['dataPresentazione']['value'],
                                titolo=result['titolo']['value'],
                                stato=result['stato']['value']
                                )
                else:
                    print "DUPLICATE %s" % (nodeName, )
    #from IPython import embed; embed()

    for iterDdl in set(g.vs['iterDdl']):
        fasiIter = g.vs(iterDdl=iterDdl)
        if len(fasiIter) > 1:
            print [v['name'] for v in fasiIter]
        fasiIter = sorted(fasiIter, key=lambda x:x['progrFase'])
        for i in range(len(fasiIter) - 1):
            fasePrec = fasiIter[i]
            faseSucc = fasiIter[i+1]
            print "            %s->%s" % (fasePrec['name'],faseSucc['name'])
            g.add_edge(fasePrec, faseSucc, iterDdl=iterDdl, tipo='iter')

    #from IPython import embed; embed()

    q_assorbimento = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT  ?codiceFaseAssorbito  ?codiceFaseAssorbente ?progrIterAssorbente
    {
    # tutte le relazioni di assorbimento
    ?iterDdl osr:assorbimento ?ddlAssorbito.

    # info sul ddl che viene assorbito
    ?ddlAssorbito a osr:Ddl; osr:statoDdl ?statoDdl; osr:dataStatoDdl ?dataAssorbimento; osr:fase ?codiceFaseAssorbito;
    osr:legislatura ?legislatura.

    #qual e l'iter che assorbe
    ?iterDdl osr:idDdl ?idddl; osr:fase ?faseIterAssorbente.

    ?faseIterAssorbente osr:ddl ?ddlAssorbente.

    ?ddlAssorbente osr:dataStatoDdl ?dataAssorbimento; osr:fase ?codiceFaseAssorbente; osr:progressivoIter ?progrIterAssorbente.

    FILTER  (?legislatura = %s).
    }
    """ % (LEGISLATURA,)

    sparql.setQuery(q_assorbimento)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()

    for result in results["results"]["bindings"]:
        codiceFaseAssorbito  = result['codiceFaseAssorbito']['value']
        codiceFaseAssorbente = result['codiceFaseAssorbente']['value']
        progrIterAssorbente  = result['progrIterAssorbente']['value']
        print "%s->%s" % (codiceFaseAssorbito, codiceFaseAssorbente)
        try:
            vertexFrom = g.vs.find(name=codiceFaseAssorbito)
        except ValueError:
            print "CANNOT FIND VERTEX WITH NAME '%s'" % (codiceFaseAssorbito,)
            from IPython import embed; embed()
        try:
            vertexTo   = g.vs.find(name=codiceFaseAssorbente)
        except ValueError:
            print "CANNOT FIND VERTEX WITH NAME '%s'" % (codiceFaseAssorbente,)
            from IPython import embed; embed()
        g.add_edge(vertexFrom,vertexTo,tipo='assorbimento', progrIterAssorbente=progrIterAssorbente)
 

def main():
    if len(sys.argv) > 1:
        LEGISLATURA=int(sys.argv[1])
    else:
        LEGISLATURA=16

    print "ELABORO LEGISLATURA %d" % (LEGISLATURA,)

    sparql = SPARQLWrapper("http://dati.senato.it/sparql")

    g = G.Graph(directed=True)

    add_assorbiti(g, LEGISLATURA, sparql)

    for v in g.vs(_outdegree_gt=1):
        ev = g.es(_source=v.index)
        ev = sorted(ev,key=lambda x:x['progrIterAssorbente'])
        g.delete_edges(ev[1:])

    g.delete_vertices(g.vs(_degree=0))

    #from IPython import embed; embed()


    nodes=[{'name':v['name'],'titolo':v['titolo'],'stato':v['stato'],'dataStato':v['dataStato'],'dataPresentazione':v['dataPresentazione']} for v in g.vs]
    links=[{'source':e.source,'target':e.target,'value':1.0, 'tipo':e['tipo']} for e in g.es]

    g.write('assorbito_'+str(LEGISLATURA)+'leg.pickle')

    from IPython import embed; embed()

    import json

    output = {'nodes':nodes,'links':links}

    with open('assorbito_'+str(LEGISLATURA)+'leg.json','w+') as f:
        json.dump(output,f)



if __name__=='__main__':
    main()
