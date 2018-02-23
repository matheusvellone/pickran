# pickran
---------

If you don't know who from your team to request for review you can choose them
randomly with `pickran`.

First you'll need to [create a token](https://github.com/settings/tokens/new?scopes=notifications,repo&description=pickran)
so `pickran` can read your org teams and add reviewers to your PR.

```sh
git clone https://github.com/MatheusVellone/pickran
cd pickran
echo TOKEN=YOUR-TOKEN > .env
./index.js ORG/REPO#PR-NUMBER
```

