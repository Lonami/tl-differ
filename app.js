const selectFrom = document.getElementById("selectFrom")
const selectTo = document.getElementById("selectTo")
const divDiff = document.getElementById("divDiff")
const stats = document.getElementById("stats")

const addedTypes = document.getElementById("addedTypes")
const addedFunctions = document.getElementById("addedFunctions")
const removedTypes = document.getElementById("removedTypes")
const removedFunctions = document.getElementById("removedFunctions")
const changedTypes = document.getElementById("changedTypes")
const changedFunctions = document.getElementById("changedFunctions")

const addedDiv = document.getElementById("addedDiv")
const removedDiv = document.getElementById("removedDiv")
const changedDiv = document.getElementById("changedDiv")
const addedTypesDiv = document.getElementById("addedTypesDiv")
const addedFunctionsDiv = document.getElementById("addedFunctionsDiv")
const removedTypesDiv = document.getElementById("removedTypesDiv")
const removedFunctionsDiv = document.getElementById("removedFunctionsDiv")
const changedTypesDiv = document.getElementById("changedTypesDiv")
const changedFunctionsDiv = document.getElementById("changedFunctionsDiv")

const collapsedDiff = []

for (const layer of DIFF) {
  const cdl = collapsedDiff.length

  if (
    cdl === 0 ||
    collapsedDiff[cdl - 1].layer === null ||
    collapsedDiff[cdl - 1].layer !== layer.layer
  ) {
    collapsedDiff.push(layer) // first or different
  } else {
    collapsedDiff[cdl - 1] = layer // replace same layer (keep latest)
  }
}

let usedDiff = collapsedDiff

const getUrlQueryParam = param =>
  ((window.location.href.split("?")[1] || "")
    .split("&")
    .map(part => part.split("="))
    .find(kv => kv[0] == param) || [])[1] || null

function changeUsedDiff(event) {
  usedDiff = event.target.checked ? collapsedDiff : DIFF
  fillSelectBoxes()
  loadDiff()
}

function layerName(layer) {
  const name = layer.layer == null ? "Unknown layer" : `Layer ${layer.layer}`
  const date = new Date(layer.date * 1000)

  const year = date.getFullYear(),
    month = `0${date.getMonth() + 1}`.slice(-2),
    day = `0${date.getDate()}`.slice(-2)

  return `[${year}-${month}-${day}] ${name}`
}

function toggleExpand(event) {
  const div = event.target.parentElement.parentElement
  const tags = div.getElementsByTagName("details")

  // open all if any is closed, close all only if all are open
  let anyClosed = false

  for (const details of tags) {
    if (!details.open) {
      anyClosed = true
      break
    }
  }

  for (const details of tags) {
    details.open = anyClosed
  }
}

function fillSelectBoxes(fromLayer, toLayer) {
  let from = null
  let to = null

  fromLayer = Number(fromLayer)
  toLayer = Number(toLayer)

  emptyNode(selectFrom)
  emptyNode(selectTo)

  for (let i = 0; i < usedDiff.length; ++i) {
    const layer = usedDiff[i]

    if (i !== usedDiff.length - 1) {
      const option = document.createElement("option")
      option.value = i
      option.innerText = layerName(layer)
      selectFrom.appendChild(option)
    }

    if (i !== 0) {
      const option = document.createElement("option")
      option.value = i
      option.innerText = layerName(layer)
      selectTo.appendChild(option)
    }

    if (from === null && fromLayer == layer.layer) {
      from = i
    }

    if (to === null && toLayer == layer.layer) {
      to = i - 1
    }
  }

  selectFrom.selectedIndex = from || usedDiff.length - 2
  selectTo.selectedIndex = to || usedDiff.length - 2
}

function changeSelectFrom() {
  if (selectFrom.selectedIndex > selectTo.selectedIndex) {
    selectFrom.selectedIndex = selectTo.selectedIndex
  }
}

function changeSelectTo() {
  if (selectTo.selectedIndex < selectFrom.selectedIndex) {
    selectTo.selectedIndex = selectFrom.selectedIndex
  }
}

function emptyNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
}

function emptyDiffLists() {
  emptyNode(addedTypes)
  emptyNode(addedFunctions)
  emptyNode(removedTypes)
  emptyNode(removedFunctions)
  emptyNode(changedTypes)
  emptyNode(changedFunctions)
}

function appendLi(ul, ...args) {
  for (const arg of args) {
    const li = document.createElement("li")

    if (typeof arg === "string") {
      li.appendChild(document.createTextNode(arg))
    } else if (arg instanceof Element) {
      li.appendChild(arg)
    } else {
      const span = document.createElement("span")
      span.className = arg.class
      span.appendChild(document.createTextNode(arg.value))
      li.appendChild(span)
    }

    ul.appendChild(li)
  }
}

function appendLiMigrate(ul, from, to, name) {
  const li = document.createElement("li")

  if (name !== undefined) {
    li.appendChild(document.createTextNode(`${name} `))
  }
  {
    const span = document.createElement("span")
    span.className = "old"
    span.appendChild(document.createTextNode(from))
    li.appendChild(span)
  }

  li.appendChild(document.createTextNode(" → "))

  const span = document.createElement("span")
  span.className = "new"
  span.appendChild(document.createTextNode(to))

  li.appendChild(span)
  ul.appendChild(li)
}

function extendList(list, items) {
  sortedItems = []

  for (const item of Object.values(items)) {
    sortedItems.push(item)
  }

  sortedItems.sort((a, b) => a.name.localeCompare(b.name))

  for (item of sortedItems) {
    const summary = document.createElement("summary")
    summary.appendChild(document.createTextNode(item.name))

    const details = document.createElement("details")
    details.appendChild(summary)

    const ul = document.createElement("ul")

    if (item.id !== null) {
      appendLi(ul, `#${("00000000" + item.id.toString(16)).slice(-8)}`)
    }

    for (arg of item.fields) {
      appendLi(ul, `${arg.name}:${arg.type}`)
    }

    appendLi(`= ${item.type}`)
    details.appendChild(ul)

    const li = document.createElement("li")
    li.appendChild(details)

    list.appendChild(li)
  }
}

function extendChangeList(list, items) {
  sortedItems = []

  for (const [name, item] of Object.entries(items)) {
    sortedItems.push(item)
  }

  sortedItems.sort((a, b) => a.after.name.localeCompare(b.after.name))

  for (item of sortedItems) {
    const summary = document.createElement("summary")
    summary.appendChild(document.createTextNode(item.after.name))

    const details = document.createElement("details")
    details.appendChild(summary)

    const ul = document.createElement("ul")

    if (item.before.id !== item.after.id) {
      // neither null nor the same
      if (item.before.id === null) {
        appendLi(ul, {
          class: "new",
          value: `#${("00000000" + item.after.id.toString(16)).slice(-8)}`,
        })
      } else if (typeof item.after.id === null) {
        appendLi(ul, {
          class: "old",
          value: `#${("00000000" + item.before.id.toString(16)).slice(-8)}`,
        })
      } else {
        appendLiMigrate(
          ul,
          `#${("00000000" + item.before.id.toString(16)).slice(-8)}`,
          `#${("00000000" + item.after.id.toString(16)).slice(-8)}`
        )
      }
    }

    // fields are a list because their order matters, so that's why
    // it's not a map already. we however work better with maps here.
    oldArgs = {}

    for (arg of item.before.fields) {
      oldArgs[arg.name] = arg
    }

    newArgs = {}

    for (arg of item.after.fields) {
      newArgs[arg.name] = arg
    }

    // figure out changed items
    for (arg of item.before.fields) {
      const current = newArgs[arg.name]

      if (typeof current !== "undefined" && arg.type !== current.type) {
        appendLiMigrate(ul, arg.type, current.type, arg.name)
      }
    }

    // figure out removed items
    for (arg of item.before.fields) {
      if (!newArgs.hasOwnProperty(arg.name)) {
        appendLi(ul, { class: "old", value: `${arg.name}:${arg.type}` })
      }
    }

    // figure out new items
    for (arg of item.after.fields) {
      if (!oldArgs.hasOwnProperty(arg.name)) {
        appendLi(ul, { class: "new", value: `${arg.name}:${arg.type}` })
      }
    }

    details.appendChild(ul)

    const li = document.createElement("li")
    li.appendChild(details)

    list.appendChild(li)
  }
}

function updateAdded(from, to, kind) {
  for (item of from.added[kind]) {
    if (item.name in to.removed[kind]) {
      // if it was removed and then added again, it was changed (probably)
      const before = to.removed[kind][item.name]

      if (item.id !== before.id) {
        to.changed[kind][item.name] = {
          before: before,
          after: item,
        }
      }
    } else {
      // if it was only added, it was added
      to.added[kind][item.name] = item
    }
    // in any case, it was removed from removed
    delete to.removed[kind][item.name]
  }
}

function updateRemoved(from, to, kind) {
  for (item of from.removed[kind]) {
    // in any case, it is added to removed, and removed from both added and changed
    to.removed[kind][item.name] = item
    delete to.added[kind][item.name]
    delete to.changed[kind][item.name]
  }
}

function updateChanged(from, to, kind) {
  for (item of from.changed[kind]) {
    if (item.after.name in to.added[kind]) {
      // if something was added and then changes, it was still newly added
    } else {
      to.changed[kind][item.after.name] = item
    }
  }
}

function setVisibleTyFn(main, ty, fn, where) {
  const tyCount = Object.keys(where.types).length
  const fnCount = Object.keys(where.functions).length

  if (tyCount === 0 && fnCount === 0) {
    main.style.display = "none"
  } else {
    main.style.display = ""
    ty.style.display = tyCount === 0 ? "none" : ""
    fn.style.display = fnCount === 0 ? "none" : ""
  }
}

function setTdText(tr, index, object) {
  tr.children[index].replaceChild(
    document.createTextNode(Object.keys(object).length.toString()),
    tr.children[index].lastChild
  )
}

function fillStats(diff) {
  const tbody = stats.children[1]
  const ty = tbody.children[0]
  const fn = tbody.children[1]

  setTdText(ty, 1, diff.added.types)
  setTdText(fn, 1, diff.added.functions)
  setTdText(ty, 2, diff.removed.types)
  setTdText(fn, 2, diff.removed.functions)
  setTdText(ty, 3, diff.changed.types)
  setTdText(fn, 3, diff.changed.functions)
}

function loadDiff() {
  divDiff.style.display = "none"

  let fromIdX = Number(selectFrom.value)
  let toIdX = Number(selectTo.value)

  if (usedDiff == collapsedDiff) {
    // figure out indices in the original diff with all data
    let needle = usedDiff[fromIdX]

    for (let i = fromIdX; i < DIFF.length; ++i) {
      if (needle == DIFF[i]) {
        fromIdX = i
        break
      }
    }

    needle = usedDiff[toIdX]

    for (let i = toIdX; i < DIFF.length; ++i) {
      if (needle == DIFF[i]) {
        toIdX = i
        break
      }
    }
  }

  const diff = {
    added: { types: {}, functions: {} },
    removed: { types: {}, functions: {} },
    changed: { types: {}, functions: {} },
  }

  for (let i = fromIdX + 1; i <= toIdX; ++i) {
    const layer = DIFF[i]

    updateAdded(layer, diff, "types")
    updateAdded(layer, diff, "functions")
    updateRemoved(layer, diff, "types")
    updateRemoved(layer, diff, "functions")
    updateChanged(layer, diff, "types")
    updateChanged(layer, diff, "functions")
  }

  emptyDiffLists()
  extendList(addedTypes, diff.added.types)
  extendList(addedFunctions, diff.added.functions)
  extendList(removedTypes, diff.removed.types)
  extendList(removedFunctions, diff.removed.functions)
  extendChangeList(changedTypes, diff.changed.types)
  extendChangeList(changedFunctions, diff.changed.functions)

  // default to showing everything, hide as needed
  setVisibleTyFn(addedDiv, addedTypesDiv, addedFunctionsDiv, diff.added)
  setVisibleTyFn(removedDiv, removedTypesDiv, removedFunctionsDiv, diff.removed)
  setVisibleTyFn(changedDiv, changedTypesDiv, changedFunctionsDiv, diff.changed)

  fillStats(diff)
  divDiff.style.display = ""
}

divDiff.style.display = "none"
selectFrom.addEventListener("change", loadDiff)
selectTo.addEventListener("change", loadDiff)

fillSelectBoxes(getUrlQueryParam("from"), getUrlQueryParam("to"))
loadDiff()
