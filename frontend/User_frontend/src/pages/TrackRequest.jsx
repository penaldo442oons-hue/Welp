import { useEffect, useState } from "react";
import { API_BASE } from "../config/api.js";

function TrackRequest(){

const [requests,setRequests]=useState([])

const fetchRequests=async()=>{

const res=await fetch(`${API_BASE}/requests`)
const data=await res.json()

setRequests(data)

}

useEffect(()=>{
fetchRequests()
},[])

return(

<div style={{padding:40}}>

<h1>Track Requests</h1>

{requests.length===0 ? (

<p>No requests yet</p>

):(

<table border="1" cellPadding="10">

<thead>

<tr>
<th>Name</th>
<th>Email</th>
<th>Message</th>
<th>Status</th>
</tr>

</thead>

<tbody>

{requests.map(r=>(

<tr key={r.id}>

<td>{r.name}</td>
<td>{r.email}</td>
<td>{r.message}</td>
<td>{r.status}</td>

</tr>

))}

</tbody>

</table>

)}

</div>

)

}

export default TrackRequest