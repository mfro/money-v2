yarn build
scp main.js api.mfro.me:server/dominion/main.js
ssh api.mfro.me startup/dominion.sh
