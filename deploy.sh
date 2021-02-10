set -e
TMP=/tmp/tldiff
mkdir $TMP
cp app.js atom.xml diff.js index.html $TMP
git checkout gh-pages
mv $TMP/* .
git commit -am "Deploy new layer"
git push
git checkout master
