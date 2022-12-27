let endpoint = `https://localhost.wrtc.dev:8765/whip`
// let endpoint = `https://whip.dev.eyevinn.technology/api/v1/whip/broadcaster`
// eyelynn link: https://web.whip.eyevinn.technology/

const rtc = {
    location: null,
    mediaStreams: [],
    peerConnection: null,
    audio: [],
    video: [],
    offer: null,
}

const updateEndpointUrl = ()=>{
    let domEndpointUrl = document.getElementById('endpoint').value
    let urlParts = domEndpointUrl.split('?')
    let searchParams = null
    if (urlParts[1]){
        searchParams = new URLSearchParams(urlParts[1])
    } else {
        searchParams = new URLSearchParams()
    }
    const channelId = document.getElementById('channelId').value
    if (channelId){
        searchParams.set('channelId', channelId)
    }
    const newEndpointUrl = `${urlParts[0]}${searchParams.toString() ? '?' :''}${searchParams.toString()}`
    if (endpoint !== newEndpointUrl){
        console.log(`updateEndpointUrl\n${endpoint}${newEndpointUrl}`)
        document.getElementById('endpoint').value = newEndpointUrl
        endpoint = newEndpointUrl
    }
}

const createResource = async ()=>{
    rtc.offer = await rtc.peerConnection.createOffer()
    console.log('offer', rtc.offer.sdp)

    // 不要await
    rtc.peerConnection.setLocalDescription(rtc.offer)

    updateEndpointUrl()
    const resp = await axios.post(endpoint, rtc.offer.sdp, {
        headers: {
            authorization: 'whipit!',
            'content-type': 'application/sdp'
        }
    })
    if (!resp.data || !resp.headers.location) {
        console.error('Invalid response', resp)
    }
    rtc.answer = new RTCSessionDescription({
        type: 'answer',
        sdp: resp.data
    })
    rtc.location = resp.headers.location
    if (resp.headers.link){
        rtc.links = resp.headers.link.split(', ')
    } else {
        rtc.links = []
    }
    rtc.peerConnection.setRemoteDescription(rtc.answer)
}

const getSelectedDevices = (mediaType)=>{
    let options
    if (mediaType === "audio"){
        options = [...document.getElementsByClassName('mic-option')].filter((option)=>{
            return option.selected
        })
    } else {
        options = [...document.getElementsByClassName('camera-option')].filter((option)=>{
            return option.selected
        })
    }
    return options
}

const initMediaStream = async ()=>{
    const micOptions = getSelectedDevices('audio')
    const cameraOptions = getSelectedDevices('video')
    let audioCnt = 0
    let videoCnt = 0
    document.getElementById('medias').innerHTML = ''
    for (let i = 0; i < micOptions.length; i++){
        const micOption = micOptions[i]
        console.log(`Audio ${micOption.value} ${micOption.innerText}`)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: micOption.value
            }
        })
        const track = mediaStream.getTracks()[0]
        if (rtc.audio[audioCnt]){
            rtc.audio[audioCnt].track = track
            rtc.audio[audioCnt].transceiver.sender.replaceTrack(track)
        } else {
            rtc.audio[audioCnt] = {track}
        }
        const audioElem =document.createElement('audio')
        audioElem.controls = true
        audioElem.srcObject = mediaStream
        document.getElementById('medias').appendChild(audioElem)
        audioCnt++
    }
    for (let i = 0; i < cameraOptions.length; i++){
        const cameraOption = cameraOptions[i]
        console.log(`Video ${cameraOption.value} ${cameraOption.innerText}`)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: cameraOption.value
            }
        })
        const track = mediaStream.getTracks()[0]
        if (rtc.video[videoCnt]){
            rtc.video[videoCnt].track = track
            rtc.video[videoCnt].transceiver.sender.replaceTrack(track)
        } else {
            rtc.video[videoCnt] = {track}
        }
        const videoElem =document.createElement('video')
        videoElem.style.width = '800px'
        videoElem.controls = true
        videoElem.playsInline = true
        videoElem.muted = true
        videoElem.autoplay = true
        videoElem.srcObject = mediaStream
        document.getElementById('medias').appendChild(videoElem)
        videoCnt++
    }
}

const resetEnv = ()=>{
    if (rtc.video.track){
        rtc.video.track.stop()
    }
    if (rtc.audio.track){
        rtc.audio.track.stop()
    }
}

const tempDiv = document.createElement('div')

const updateView = ()=>{
    if (rtc.links){
        let html = ''
        rtc.links.forEach((link)=>{
            tempDiv.innerText = link
            html += `<li>${tempDiv.innerHTML}</li>`
        })
        document.getElementById('links').innerHTML = html
    }
    if (rtc.location){
        document.getElementById('location').innerHTML = rtc.location
    }
}

const initPC = ()=>{
    if (rtc.peerConnection){
        rtc.peerConnection.close()
        rtc.audio = []
        rtc.video = []
    }
    rtc.peerConnection = new RTCPeerConnection()
    rtc.peerConnection.onconnectionstatechange = ()=>{
        console.log('rtc.peerConnection.onconnectionstatechange', rtc.peerConnection.connectionState)
        if (rtc.peerConnection.connectionState === 'failed'){
            resetEnv()
        }
    }
    rtc.peerConnection.onsignalingstatechange = ()=>{
        console.log('rtc.peerConnection.onsignalingstatechange', rtc.peerConnection.signalingState)
    }
    rtc.peerConnection.oniceconnectionstatechange = ()=>{
        console.log('rtc.peerConnection.oniceconnectionstatechange', rtc.peerConnection.iceConnectionState)
        if (rtc.peerConnection.iceConnectionState === 'connected'){
            updateView()
        } else if (rtc.peerConnection.iceConnectionState === 'failed'){
            resetEnv()
        }
    }
    const audioDevices = getSelectedDevices('audio')
    for (let i = 0; i < audioDevices.length; i++){
        const transceiver = rtc.peerConnection.addTransceiver('audio', {
            direction: 'sendonly'
        })
        if (rtc.audio[i]){
            rtc.audio[i].transceiver = transceiver
            transceiver.replaceTrack(rtc.audio[i].track)
        }else {
            rtc.audio[i] = {transceiver}
        }
    }
    const videoDevices = getSelectedDevices('video')
    for (let i = 0; i < videoDevices.length; i++){
        const transceiver = rtc.peerConnection.addTransceiver('video', {
            direction: 'sendonly'
        })
        if (rtc.video[i]){
            rtc.video[i].transceiver = transceiver
            transceiver.replaceTrack(rtc.video[i].track)
        }else {
            rtc.video[i] = {transceiver}
        }
    }
}

const startPush = async ()=>{
    initPC()
    await Promise.all([createResource(), initMediaStream()])
}

let refreshDeviceCnt = 0
const refreshDevices = async ()=>{
    let devices = null
    if (refreshDeviceCnt){
        const mediaStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
        devices = await navigator.mediaDevices.enumerateDevices()
        mediaStream.getTracks().forEach((track)=>{
            track.stop()
        })
    } else {
        devices = await navigator.mediaDevices.enumerateDevices()
    }
    refreshDeviceCnt++
    let cameraHtml = ''
    let micHtml = ''
    for (let i in devices){
        if (devices[i].kind === 'audioinput'){
            micHtml += `<option class="mic-option" value="${devices[i].deviceId}" ${micHtml ? "": "selected"}>${devices[i].label}</option>`
        } else if (devices[i].kind === 'videoinput'){
            cameraHtml += `<option class="camera-option" value="${devices[i].deviceId}" ${cameraHtml ? "": "selected"}>${devices[i].label}</option>`
        }
    }
    document.getElementById('cameraIds').innerHTML = cameraHtml
    document.getElementById('micIds').innerHTML = micHtml
}

const main = async ()=>{
    refreshDevices()
    document.getElementById('endpoint').value = endpoint
    document.getElementById('start-push').onclick = startPush
    document.getElementById('refresh-devices').onclick = refreshDevices
}

main()
