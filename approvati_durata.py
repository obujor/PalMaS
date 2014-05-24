import csv
import igraph as G
from SPARQLWrapper import SPARQLWrapper, JSON
from datetime import datetime
import sys


def getIddlList(LEGISLATURA,sparql):
    # ddl e legislatura
    maxIdDdl = -1
    idddlList=[]

    Found = True

    while Found:
        print "chunk offset %s" % (maxIdDdl)
        q_idddl = """PREFIX osr: <http://dati.senato.it/osr/>
        SELECT DISTINCT ?idddl ?iterDdl
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
                idddlList.append((int(result['idddl']['value']), result['iterDdl']['value']))

            maxIdDdl = max([idddl[0] for idddl in idddlList])

        else:
            Found = False

    return idddlList


def addVertices(g,sparql,LEGISLATURA,idddlList):
    CHUNK=1000
    idddlList = sorted(idddlList)
    while idddlList:
        idddlChunk = idddlList[:CHUNK]
        idddlList = idddlList[CHUNK:]
        minIdddl = min(idddlChunk)
        maxIdddl = max(idddlChunk)
        print "idddl [%s,%s]" % (minIdddl,maxIdddl)
        # ddl e legislatura
        q_ddl_legislatura = """PREFIX osr: <http://dati.senato.it/osr/>
        SELECT DISTINCT ?legislatura ?ddl ?stato ?dataPresentazione ?titolo ?fase ?idfase ?progressivoIter ?idddl ?ramo ?natura ?numeroFase ?dataStato
        {
        ?ddl a osr:Ddl; osr:legislatura ?legislatura; osr:statoDdl ?stato; osr:dataStatoDdl ?dataStato; osr:dataPresentazione ?dataPresentazione;
        osr:titolo ?titolo; osr:fase ?fase; osr:idFase ?idfase; osr:progressivoIter ?progressivoIter; osr:idDdl ?idddl;
        osr:ramo ?ramo; osr:natura ?natura; osr:numeroFase ?numeroFase.
        FILTER(?legislatura=%s)
        FILTER(?idddl >= %s AND ?idddl <= %s).
        }""" % (LEGISLATURA,minIdddl, maxIdddl)


        sparql.setQuery(q_ddl_legislatura)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()

        for result in results["results"]["bindings"]:
            #print "ADD DDL %s idddl %s" % (result['ddl']['value'], int(result['idddl']['value']))
            g.add_vertex(name=result['ddl']['value'], tipo='ddl', titolo=result['titolo']['value'], legislatura=result['legislatura']['value'], stato=result['stato']['value'], dataPresentazione=result['dataPresentazione']['value'], fase=result['fase']['value'], idfase=result['idfase']['value'],
                    idddl=int(result['idddl']['value']), dataStato = result['dataStato']['value'])



def main():
    if len(sys.argv) > 1:
        LEGISLATURA=int(sys.argv[1])
    else:
        LEGISLATURA=16

    print "ELABORO LEGISLATURA %d" % (LEGISLATURA,)

    sparql = SPARQLWrapper("http://dati.senato.it/sparql")

    g = G.Graph(directed=True)

    idddlIterDdlList = getIddlList(LEGISLATURA,sparql)

    #q_iterDdl = """PREFIX osr: <http://dati.senato.it/osr/>
    #SELECT DISTINCT ?iterDdl ?idddl
    #{
    #?ddl a osr:Ddl; osr:idDdl ?idddl; osr:legislatura ?legislatura.
    #?iterDdl a osr:IterDdl; osr:idDdl ?idddl.
    #FILTER(?legislatura = %s)
    #}""" % (LEGISLATURA,)

    #sparql.setQuery(q_iterDdl)
    #sparql.setReturnFormat(JSON)
    #results = sparql.query().convert()
    print "addVertices"
    print g.summary()
    addVertices(g,sparql,LEGISLATURA,[iddl[0] for iddl in idddlIterDdlList])

    print g.summary()

    for (idddl, iterDdl) in idddlIterDdlList:
        print "vertex %s idddl %s" % (iterDdl, idddl)
        g.add_vertex(name=iterDdl, tipo='iterDdl',idddl=idddl)

    print "Add iterddl edges"
    for u in g.vs(tipo='iterDdl'):
        idddl=u['idddl']
        vl=g.vs(tipo='ddl')(idddl=idddl)
        #print u,list(vl)
        for v in vl:
            g.add_edge(u,v,name=idddl,tipo='iterddl')

    print g.summary()

    print "add assorbimento"
    q_assorbimento = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT ?iterDdl ?ddl 
    {
    ?ddl a osr:Ddl; osr:legislatura ?legislatura.
    ?iterDdl a osr:IterDdl; osr:assorbimento ?ddl; osr:fase ?faseIterAssorbente.
    ?faseIterAssorbente osr:ddl ?ddlAssorbente.
    ?ddlAssorbente osr:legislatura ?legislaturaAssorbente.
    FILTER(?legislatura = %s)
    FILTER(?legislatura = ?legislaturaAssorbente)

    }""" % (LEGISLATURA,)


    sparql.setQuery(q_assorbimento)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()

    for result in results["results"]["bindings"]:
        iterDdl = result['iterDdl']['value']
        try:
            u=g.vs.find(name=iterDdl)
        except ValueError:
            print "Cannot find vertex %s" % (iterDdl, )
            sys.exit()
            from IPython import embed; embed()
            
        ddl = result['ddl']['value']
        try:
            v=g.vs.find(name=ddl)
        except ValueError:
            print "Cannot find vertex %s" % (ddl, )
            sys.exit()
            from IPython import embed; embed()

        g.add_edge(u,v,name=idddl,tipo='assorbimento')

    print g.summary()

    print "add testo unificato"

    q_testo_unificato = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT ?iterDdl ?ddl
    {
    ?ddl a osr:Ddl; osr:idDdl ?idddl; osr:legislatura ?legislatura.
    ?iterDdl a osr:IterDdl; osr:testoUnificato ?ddl.
    FILTER(?legislatura = %s)

    }""" % (LEGISLATURA,)


    sparql.setQuery(q_testo_unificato)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()


    for result in results["results"]["bindings"]:
        u=g.vs.find(name=result['iterDdl']['value'])
        v=g.vs.find(name=result['ddl']['value'])
        g.add_edge(u,v,name=idddl,tipo='testoUnificato')

    print g.summary()
    
    print "add stralcio"
    q_stralcio = """PREFIX osr: <http://dati.senato.it/osr/>
    SELECT DISTINCT ?iterDdl ?ddl
    {
    ?ddl a osr:Ddl; osr:idDdl ?idddl; osr:legislatura ?legislatura.
    ?iterDdl a osr:IterDdl; osr:stralcio ?ddl.
    FILTER(?legislatura = %s)

    }""" % (LEGISLATURA,)


    sparql.setQuery(q_stralcio)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()


    for result in results["results"]["bindings"]:
        u=g.vs.find(name=result['iterDdl']['value'])
        v=g.vs.find(name=result['ddl']['value'])
        g.add_edge(u,v,name=idddl,tipo='stralcio')

    print g.summary()

    STATI_APPROVAZIONE=['approvato definitivamente. Legge','approvato definitivamente, non ancora pubblicato']

    g.save(str(LEGISLATURA)+'_leg.pickle')

    g.vs(tipo='ddl')['shape']='square'
    g.vs(tipo='ddl')['color']='black'
    g.vs(tipo='ddl')(stato_in=STATI_APPROVAZIONE)['color']='green'
    g.vs(tipo='iddl')['color']='yellow'
    g.es(tipo='assorbimento')['color']='blue'
    g.es(tipo='stralcio')['color']='red'
    g.es(tipo='testoUnificato')['color']='green'

    g.save(str(LEGISLATURA)+'_leg.pickle')

    gg=g.decompose(mode=G.WEAK)

    gg=sorted(gg,key=lambda x: x.vcount(),reverse=True)

    gg_approvati = [ggg for ggg in gg if len(ggg.vs(tipo='ddl')(stato_in=STATI_APPROVAZIONE)) > 0]

    sorted([len(ga.vs(tipo='ddl')) for ga in gg_approvati])


    approvati_durata=[]
    durata_approvazione=[]
    for ga in gg_approvati:
        primaPresentazione=min(ga.vs(dataPresentazione_ne=None)['dataPresentazione'])
        datePrimaPresentazione = datetime.strptime(primaPresentazione, '%Y-%m-%d')
        dataApprovato = max(ga.vs(stato_in=STATI_APPROVAZIONE)['dataStato'])
        dateDataApprovato = datetime.strptime(dataApprovato, '%Y-%m-%d')
        titoloApprovato = ga.vs(stato_in=STATI_APPROVAZIONE)['titolo'][0]
        approvati_durata.append((titoloApprovato, primaPresentazione, dataApprovato, (dateDataApprovato - datePrimaPresentazione).days))
        durata_approvazione.append((dateDataApprovato - datePrimaPresentazione).days)



    with open('approvati_'+str(LEGISLATURA)+'leg_durata.csv','w+') as f:
        wr = csv.writer(f)
        for ad in approvati_durata:
            wr.writerow((ad[0].encode('utf-8'),ad[1],ad[2],ad[3]))

if __name__ == '__main__':
    main()
