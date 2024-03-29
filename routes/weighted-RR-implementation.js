// Server object
{
  host: 'localhost',
  port: 3000,
  // Higher weighted servers get more requests
  weight: 1 
}

// Total weights
let totals = [];

// Generate list of cumulative weights 
function initWeights() {

  totals = [];
  let runningTotal = 0;

  for (let i = 0; i < servers.length; i++) {
    runningTotal += servers[i].weight;
    totals.push(runningTotal); 
  }

}

function getServer() {

  const random = Math.floor(Math.random() * totals[totals.length - 1]) + 1;

  // Find server at index for this weight
  for (let i = 0; i < totals.length; i++) {
    if (random <= totals[i]) {
      return servers[i];
    }
  }
}
