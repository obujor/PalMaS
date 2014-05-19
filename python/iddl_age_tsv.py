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
  parser.add_argument('csv_read', help='path csv sorgente')
  parser.add_argument('dataPresentazione', help='n colonna della data di presentazione', type=int)
  parser.add_argument('dataApprovazione', help='n colonna della data di approvazione', type=int)
  parser.add_argument('tsv_write', help='path tsv da produrre')
  args = parser.parse_args()
  
  with open(args.csv_read, 'rb') as csvfile: #open the csv file
    reader = csv.reader(csvfile) 
    header = next(reader) #skip the header
    age = [] # init age array
        
    for row in reader: # for each row
        t0 = datetime.strptime(row[args.dataPresentazione], '%Y-%m-%d') # calculate the t0 TS
        t1 = datetime.strptime(row[args.dataApprovazione], '%Y-%m-%d') # calculate the t1 TS
        diff = t1 - t0 # calculate the difference between the two TS
        age.append(diff.days) # append the difference in 'days' to the end of the age array
    maxAge = float(max(age)) # calculate the max of all the ages
    print('max age: '+str(maxAge))
    
  with open(args.csv_read, 'rb') as csvfile: # open again the csv file
    reader = csv.reader(csvfile)
    c = csv.writer(open(args.tsv_write, 'wb'),delimiter='\t') # open the tsv file
    header = next(reader) # skip the header
    
    printheader = [] # init the header for the tsv file
    printheader.append(header[0]) # take the first column (with the ID)
    printheader.append('age') # append the age
    printheader.append('natura') # append the kind of law
    c.writerow(printheader) # write on the tsv the whole header row
    
    for row in reader:
        t0 = datetime.strptime(row[args.dataPresentazione], '%Y-%m-%d') # calculate the t0 TS
        t1 = datetime.strptime(row[args.dataApprovazione], '%Y-%m-%d') # calculate the t1 TS
        diff = t1 - t0 # calculate the difference between the two TS
        printrow = [] # init row to print
        printrow.append(row[0]) # append the ID column
        rateAge = (diff.days)/maxAge # calculate rate age
        printrow.append(rateAge) # append to the tsv
        natura = str(row[4]) # get kind of law
        printrow.append(natura.replace(' ', '').replace('-', '')) # cleanup name        
        c.writerow(printrow) # append row to the tsv file
        
