"""Reordena os blocos `create table` de um dump para que tabelas referenciadas venham antes."""
import re
import sys

texto = open(sys.argv[1], encoding="utf-8").read()
partes = re.split(r"(?=^create table )", texto, flags=re.M)
cabecalho, blocos = partes[0], partes[1:]
nome = lambda b: re.match(r"create table (\S+)", b).group(1)
por_nome = {nome(b): b for b in blocos}


def deps(b):
    out = set()
    for ref in re.findall(r"REFERENCES (\w+(?:\.\w+)?)\(", b):
        n = ref if "." in ref else "public." + ref
        if n in por_nome and n != nome(b):
            out.add(n)
    return out


feitos, ordem = set(), []


def visita(n):
    if n in feitos:
        return
    feitos.add(n)
    for d in sorted(deps(por_nome[n])):
        visita(d)
    ordem.append(n)


for n in por_nome:
    visita(n)
print(cabecalho + "".join(por_nome[n] for n in ordem))
