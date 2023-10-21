const { createClient } = supabase

const supabaseUrl = 'https://syqgkzkwgbxeflzoymsz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cWdremt3Z2J4ZWZsem95bXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc2Nzg1MzAsImV4cCI6MjAxMzI1NDUzMH0.yoyq_hRqjq0zCNY5U6DCbXrylZmzFd7M0Q3gvlwrL_c'
const supabaseClient = createClient(supabaseUrl, supabaseKey)

const loginButton = document.getElementById('signInBtn')
const logoutButton = document.getElementById('signOutBtn')

const whenSignedIn = document.getElementById('whenSignedIn')
const whenSignedOut = document.getElementById('whenSignedOut')
const userDetails = document.getElementById('userDetails')

const myThingsSection = document.getElementById('myThing')
const myThingsList = document.getElementById('myThingsList')
const createMyThing = document.getElementById('createMyThingBtn')

const allThingSection = document.getElementById('allThing')
const allThingList = document.getElementById('allThingList')


// event handler

loginButton.addEventListener('click', () => {
  supabaseClient.auth.signInWithOAuth({
    provider: 'google'
  })
})

logoutButton.addEventListener('click', () => {
  supabaseClient.auth.signOut()
})

createMyThing.addEventListener('click', async () => {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser()
  const thing = createRandomThing(user)
  await supabaseClient.from('things').insert([thing])
})

// init

let allThings = {}
let myThings = {}
let myThingSubscription = null
checkUserOnStartUp()
getAllIntialThing().then(listenToAllThingChanged)

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    adjustForUser(session?.user)
  } else {
    adjustForNoUser()
  }
})

// function declare

async function checkUserOnStartUp() {
  const {
    data: {user}
  } = await supabaseClient.auth.getUser()
  if (user) {
    adjustForUser(user)
    await getMyInitialThing(user)
    listenToMyThingChange(user)
  } else {
    adjustForNoUser()
  }
}

function adjustForUser(user) {
  whenSignedIn.hidden = false
  whenSignedOut.hidden = true
  myThingsSection.hidden = false
  userDetails.innerHTML = `
    <h3>Hi ${user.user_metadata.full_name}</h3>
    <img src="${user.user_metadata.avatar_url}"/>
    <p>UID: ${user.id}</p>
  `
}

function adjustForNoUser() {
  whenSignedIn.hidden = true
  myThingsSection.hidden = true
  if (myThingSubscription) {
    myThingSubscription.unsubscribe()
    myThingSubscription = null
  }
}

function createRandomThing(user) {
  return {
    name: faker.commerce.productName(),
    weight: Math.round(Math.random() * 100),
    owner: user.id
  }
}

// all things

async function getAllIntialThing() {
  const { data } = await supabaseClient.from('things').select()
  for (const thing of data) {
    allThings[thing.id] = thing
  }
  renderAllThing()
}

function renderAllThing() {
  const tableHeader = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Weight</th>
      </tr>
    </thead>
  `

  const tableBody = Object.values(allThings)
    .sort((a, b) => b.weight - a.weight)
    .map(thing =>
      `
        <tr>
          <td>${thing.name}</td>
          <td>${thing.weight}</td>
        </tr>
      `
    )
    .join('')
  
    allThingList.innerHTML = `
      <table class="table">
        ${tableHeader}
        <tbody>
          ${tableBody}
        </tbody>
      </table>
    `
}

function listenToAllThingChanged() {
  supabaseClient
    .channel('public:thing')
    .on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'things' },
      handleAllThingChanged
    )
    .subscribe()
}

function handleAllThingChanged(update) {
  if (update.eventType === 'DELETE') {
    delete allThings[update.old.id]
  } else {
    allThings[update.new.id] = update.new
  }
  renderAllThing()
}


// my things

async function getMyInitialThing(user) {
  const { data } = await supabaseClient
    .from('things')
    .select('*')
    .eq('owner', user.id)
    
  for (const thing of data) {
    myThings[thing.id] = thing
  }
  renderMyThing()
}

function renderMyThing() {
  const tableHeader = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Weight</th>
        <th></th>
      </tr>
    </thead>
  `

  const tableBody = Object.values(myThings)
    .sort((a, b) => b.weight - a.weight)
    .map(thing =>
      `
        <tr>
          <td>${thing.name}</td>
          <td>${thing.weight}</td>
          <td>${deleteButtonTemplate(thing)}</td>
        </tr>
      `
    )
    .join('')

    myThingsList.innerHTML = `
      <table class="table">
        ${tableHeader}
        <tbody>
          ${tableBody}
        </tbody>
      </table>
    `
}

function deleteButtonTemplate(thing) {
  const trashIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0,0,256,256">
  <g fill="#ff0000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(10.66667,10.66667)"><path d="M10,2l-1,1h-4c-0.6,0 -1,0.4 -1,1c0,0.6 0.4,1 1,1h2h10h2c0.6,0 1,-0.4 1,-1c0,-0.6 -0.4,-1 -1,-1h-4l-1,-1zM5,7v13c0,1.1 0.9,2 2,2h10c1.1,0 2,-0.9 2,-2v-13zM9,9c0.6,0 1,0.4 1,1v9c0,0.6 -0.4,1 -1,1c-0.6,0 -1,-0.4 -1,-1v-9c0,-0.6 0.4,-1 1,-1zM15,9c0.6,0 1,0.4 1,1v9c0,0.6 -0.4,1 -1,1c-0.6,0 -1,-0.4 -1,-1v-9c0,-0.6 0.4,-1 1,-1z"></path></g></g>
  </svg>
  `

  return `
    <button
      onclick=deleteMyThing(${thing.id})
      class="btn btn-outline-danger">
      ${trashIcon}
    </button>
  `
}

async function deleteMyThing(id) {
  await supabaseClient
    .from('things')
    .delete()
    .eq('id', id)
}

function listenToMyThingChange(user) {
  if (myThingSubscription) {
    return
  }

  myThingSubscription = supabaseClient
    .channel(`public:thing:owner=eq.${user.id}`)
    .on(
      'postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'things', 
        filter: `owner=eq.${user.id}`
      },
      handleMyThingChange
    )
    .subscribe()
}

function handleMyThingChange(update) {
  if (update.eventType === 'DELETE') {
    delete myThings[update.old.id]
  } else {
    myThings[update.new.id] = update.new
  }
  renderMyThing()
}