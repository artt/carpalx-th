import fs from "fs"
import Carpalx from "./carpalx"
import { ILayout, Layout, LayoutOptions } from "./layout"

const layoutName = (process.argv[2] as LayoutOptions["name"]) || "kedmanee"
const outputFile = process.argv[3] || "out/result.txt"
const noLock = (process.argv[4] || "").toLowerCase() == "nolock"

console.log("Arguments: ", { outputFile, layoutName, noLock })

// Simulated Annealing constants
// If you want the temperature to drop faster, use a larger value of 𝑘. To start with a cooler system, set a lower 𝑇0.

// Default
// const t0 = 10, // Initial temperature
//   k = 10, // Constant
//   p0 = 1, // Initial probability
//   N = 50000 // Number of iterations until probability reaches 0

const T = true,
  F = false

// prettier-ignore
const lockedKeys: ILayout<boolean> = [
  // [T,T,T,T,T,T,T,T,T,T,T,T],
  // [F,F,F,F,F,F,F,F,F,F,F,F,F],
  // [F,F,F,F,F,F,F,F,F,F,F],
  // [F,F,F,F,F,F,F,F,F,F],
  // [T,T,T,T,T,T,T,T,T,T,T,T],
  // [T,T,T,T,T,T,T,T,T,T,T,T,T],
  // [T,T,T,T,T,T,T,T,T,T,T],
  // [T,T,T,T,T,T,T,T,T,T],

  // [T,T,T,T,T,T,T,T,T,T,T,T],
  // [F,F,F,F,F,F,F,F,F,F,F,T,T],
  // [F,F,F,F,F,F,F,F,F,F,F],
  // [F,F,F,F,F,F,F,F,F,F],
  // [T,T,T,T,T,T,T,T,T,T,T,T],
  // [F,F,F,F,F,F,F,F,F,F,F,T,T],
  // [F,F,F,F,F,F,F,F,F,F,T],
  // [F,F,F,F,F,F,F,F,F,T],

  // for kedmanee_base into colemak-dh
  [T,T,T,T,T,T,T,T,T,T,T,T],
  [F,F,F,F,F,F,F,F,F,F,T,T,T],
  [F,F,F,F,F,F,F,F,F,F,F],
  [F,F,F,F,F,F,F,F,F,F],
  [T,T,T,T,T,T,T,T,T,T,T,T],
  [F,F,F,F,F,F,F,F,F,F,T,T,T],
  [F,F,F,F,F,F,F,F,F,F,T],
  [F,F,F,F,F,F,F,F,F,T],
]

// let boolLockedKeys = lockedKeys as boolean[][]

let currentLayout = new Layout({
  name: layoutName,
  lockedKeys: noLock ? [] : lockedKeys,
})

const baseCarpalx = new Carpalx({ layout: new Layout({ name: "kedmanee" }) })
const baselineEffort = baseCarpalx.sumTypingEfforts(true)

const percentRatio = 100 / baselineEffort
let currentSumEffort = 100

console.log("Optimizing")

const pos = currentLayout.pos
const numKeys = pos.length
const numSteps = 2

let startMatrix
// let bestMatrix

let minPrevPass = 1000

let pass = 0
while (true) {

  pass ++
  
  console.log("PASS", pass)

  startMatrix = JSON.parse(JSON.stringify(currentLayout.matrix))
  console.log("Staring with...")
  console.log(`${currentLayout.matrix
    .map((l) => JSON.stringify(l))
    .join("\n")}\n==========================\n`)

  let minThisPass = minPrevPass
  let bestA = -1, bestB = -1
  
  for (let a = 0; a < numKeys; a ++) {
    const [xa, ya] = currentLayout.pos[a];
    if (lockedKeys[xa] && lockedKeys[xa][ya])
      continue
    for (let b = a + 1; b < numKeys; b ++) {
      const [xb, yb] = currentLayout.pos[b];
      if (lockedKeys[xb] && lockedKeys[xb][yb])
        continue
      // now try swap
      currentLayout.matrix = JSON.parse(JSON.stringify(startMatrix))
      currentLayout.swapKeyPairForLayoutAtIndices(a, b)
      const currentCarpalx = new Carpalx({ layout: currentLayout })
      currentSumEffort = currentCarpalx.sumTypingEfforts(true) * percentRatio

      if (currentSumEffort < minThisPass) {
        console.log("This is a better way!", a, b, currentSumEffort, "\tswap:", startMatrix[xa][ya], "<->", startMatrix[xb][yb])
        bestA = a
        bestB = b
        minThisPass = currentSumEffort
      }
      
    }
  }

  if (bestA > -1 && bestB > -1) {
    minPrevPass = minThisPass
    currentLayout.matrix = JSON.parse(JSON.stringify(startMatrix))
    currentLayout.swapKeyPairForLayoutAtIndices(bestA, bestB)
    const [xa, ya] = currentLayout.pos[bestA];
    const [xb, yb] = currentLayout.pos[bestB];
    console.log('=============')
    console.log(`Finished pass ${pass}`)
    console.log(bestA, bestB, minThisPass)
    console.log("Swap:", startMatrix[xa][ya], "<->", startMatrix[xb][yb])
    console.log('=============')

    fs.appendFileSync(
      outputFile,
      `${pass}: ${minThisPass.toFixed(5)} Swap ${startMatrix[xa][ya]}, "<->", ${startMatrix[xb][yb]
      }\n\n${currentLayout.matrix
        .map((l) => JSON.stringify(l))
        .join("\n")}\n==========================\n`,
      "utf-8"
    )
  }
  else {
    // no possible improvement
    console.log("No further improvement")
    break
  }

}

