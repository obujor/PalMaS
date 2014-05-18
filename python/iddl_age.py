#!/usr/bin/env python

import argparse
import string
import Image, ImageOps
import logging
import urllib
import csv
from datetime import datetime
from urlparse import urlparse


# Main ########################################################################
if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('csv_read', help='file csv sorgente')
  parser.add_argument('dataPresentazione', help='n colonna', type=int)
  parser.add_argument('dataApprovazione', help='n colonna', type=int)
  parser.add_argument('csv_write', help='path del csv da produrre')
  args = parser.parse_args()
  
  with open(args.csv_read, 'rb') as csvfile:
    reader = csv.reader(csvfile)
    c = csv.writer(open(args.csv_write, 'wb'))
    header = next(reader)
    header.append('age')
    c.writerow(header)
    for row in reader:
        t0 = datetime.strptime(row[args.dataPresentazione], '%Y-%m-%d')
        t1 = datetime.strptime(row[args.dataApprovazione], '%Y-%m-%d')
        diff = t1 - t0
        row.append(diff.days)
        c.writerow(row)
