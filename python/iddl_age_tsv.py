#!/usr/bin/env python

import argparse
import string
import Image, ImageOps
import logging
import urllib
import csv
import time
import calendar
from datetime import datetime
from urlparse import urlparse


# Main ########################################################################
if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('csv_read', help='file csv sorgente')
  parser.add_argument('dataPresentazione', help='n colonna', type=int)
  parser.add_argument('dataApprovazione', help='n colonna', type=int)
  parser.add_argument('tsv_write', help='path del tsv da produrre')
  args = parser.parse_args()
  
  with open(args.csv_read, 'rb') as csvfile:
    reader = csv.reader(csvfile)
    header = next(reader)
    
    age = []
        
    for row in reader:
        t0 = datetime.strptime(row[args.dataPresentazione], '%Y-%m-%d')
        t1 = datetime.strptime(row[args.dataApprovazione], '%Y-%m-%d')
        
        diff = t1 - t0
        age.append(diff.days)
        
    maxAge = float(max(age))
    
  with open(args.csv_read, 'rb') as csvfile:
    reader = csv.reader(csvfile)
    c = csv.writer(open(args.tsv_write, 'wb'),delimiter='\t')
    header = next(reader)
    
    printheader = []
    printheader.append(header[0])
    printheader.append('age')
    c.writerow(printheader)
    
    for row in reader:
        t0 = datetime.strptime(row[args.dataPresentazione], '%Y-%m-%d')
        t1 = datetime.strptime(row[args.dataApprovazione], '%Y-%m-%d')
        
        diff = t1 - t0
        printrow = []
        printrow.append(row[0])
        rateAge = (diff.days)/maxAge
        printrow.append(rateAge)
        age.append(diff.days)
        
        #row.append(calendar.timegm(t0.utctimetuple()))
        #row.append(calendar.timegm(t1.utctimetuple()))
        c.writerow(printrow)
        
