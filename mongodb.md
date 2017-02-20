# MongoDB on localhost
- For local testing setup a mongodb on localhost
  - use port 27017
  - no username/pw required

# MongoDB connector in yaap
- install the mongodb connector for loopback: _npm install loopback-connector-mongodb --save_
- the mongo db name is _yaap_ (already configured in yaap application)
- Create an Api document using the explorer: _http://localhost:3000/explorer_
- Check using the mongo shell: 
  - _mongodb/bin/mongo_
  - _use yaap_
  - _db.api.find()_ will show you the new created Api document
