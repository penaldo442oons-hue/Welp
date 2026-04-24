import { API_BASE } from "../config/api.js"

export const getRequests = () =>
fetch(`${API_BASE}/requests`).then(r=>r.json())

export const createRequest = (data)=>
fetch(`${API_BASE}/requests`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify(data)
})

export const resolveRequest = (id)=>
fetch(`${API_BASE}/requests/${id}/resolve`,{
method:"PUT"
})

export const deleteRequest = (id)=>
fetch(`${API_BASE}/requests/${id}`,{
method:"DELETE"
})