import json

assorbito = json.load(open('assorbitoold.json','r'))

snodes=list(set([v['id_atto']['value'] for v in assorbito['results']['bindings']]+[v['id_atto_portante']['value'] for v in assorbito['results']['bindings']]))
slinks=list(set([(v['id_atto']['value'],v['id_atto_portante']['value']) for v in assorbito['results']['bindings']]))


nodes = [{'name':v} for v in snodes]
links = [{'source':snodes.index(v[0]),'target':snodes.index(v[1]),'value':1.0} for v in slinks]

output = {'nodes':nodes,'links':links}

with open('assorbito.json','w+') as f:
    json.dump(output,f)


