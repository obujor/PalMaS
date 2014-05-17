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
  parser.add_argument('csv', help='file csv sorgente')
  parser.add_argument('json', help='path del json da produrre')
  args = parser.parse_args()
  
  print(args.csv)
  
  with open(args.csv, 'rb') as csvfile:
    reader = csv.reader(csvfile)
    next(reader)
    for row in reader:
        
        t0 = datetime.strptime(row[1], '%Y-%m-%d')
        t1 = datetime.strptime(row[2], '%Y-%m-%d')
        diff = t1 - t0
        print(diff.days)
