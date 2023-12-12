//Voice events handler function 
import axios from "axios"; //import axios 
import log4js from "log4js";

// Configure the logger
log4js.configure({
    appenders: { console: { type: "console" } },
    categories: { default: { appenders: ["console"], level: "trace" } },
});
// Get the logger instance
const logger = log4js.getLogger();

export const handler = async (event) => {
    logger.info(`Getting events from Amazon EventBridge...`);
    // TODO implement
    let contactId;
    let agentId;
    let conversation;
    let conversationId;
    let response;
    let participantList;
    let agentExists;
    let count;

    // console.log("Event details: ", JSON.stringify(event));
    logger.debug(`Event details: ${JSON.stringify(event)}`);
    //Normal Inbound Conversation
    //Add connected Agent as participant in conversation
    if (event.detail.channel == "VOICE" && event.detail.eventType == "CONNECTED_TO_AGENT" && event.detail.initiationMethod == "INBOUND") {
        // console.log("Inbound connected to agent section.");
        logger.info(`Agent 1 connected to the call we are going to add this agent in conversation...`);
        //console.log("Event detail: ",JSON.stringify(event));
        contactId = event.detail.contactId; //get contact id

        const agentArn = event.detail.agentInfo.agentArn;
        agentId = agentArn.split('/').pop();
        logger.debug(`Connected agent ARN: ${agentArn}`);
        logger.debug(`Connected agent Id: ${agentId}`);

        //get conversation by id when any event occur but first event is initiated
        logger.debug(`Finding Conversation against contact id: ${contactId}`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        logger.debug(`Conversation in connected to agent event: ${conversation}`);
        logger.debug(`Conversation id in connected to agent event: ${conversationId}`);


        //Get Participant List for verification of participant
        logger.info(`Getting participant list from conversation...`);
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        // console.log("Participant List: ", participantList);
        logger.debug(`Participant List: ${participantList}`);

        logger.info(`Finding connected agent already in conversation or not...`);
        const agentArns = new Set(participantList.map(participant => participant.agentArn));
        agentExists = agentArns.has(agentId);

        if (agentExists) {
            // console.log("Agent already exists.");
            logger.info(`Connected agent is already exist in conversation.`);
        }
        else {
            // console.log("Agent does not exist. Add this agent.");
            logger.info(`Agent does not exist. Add this agent.`);
            //add participant
            const data = {
                participantType: "Agent",
                agentArn: agentId,
                isActive: true,
                participantRole: "Primary"
            };

            logger.debug(`Connected agent details: ${data}`);
            //Add participant using agent arn with axios call
            //const addParticipant = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${contactId}`, data);

            logger.info(`Adding paricipant in conversation...`);
            response = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`, data);
            // console.log("Participant added successfully: ", response.data);
            if (response) {
                logger.debug(`Participant added successfully: ${response.data}`);
            } else {
                logger.error(`Error adding participant in conversation...`);
            }

        };


    }


    else if (event.detail.channel == "VOICE" && event.detail.eventType == "DISCONNECTED" && event.detail.initiationMethod == "INBOUND") {
        // console.log("Inbound disconnected section.");
        logger.info(`Agent 1 disconnected from call we are going to remove this agent from conversation...`);
        contactId = event.detail.contactId;

        logger.info(`Finding conversation in disconnected event...`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        // console.log("Conversation before remove agent is: ", conversation);
        logger.debug(`Conversation before remove agent is: ${conversation}`);
        logger.debug(`Conversation id: ${contactId}`);
        logger.debug(`Conversation id: ${conversationId}`);

        //Get participant list after deleting participant
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        // console.log("Participant List before deleting participant in inbound disconnected : ", participantList);
        logger.debug(`Participant List before deleting participant in inbound disconnected : ${participantList}`);

        //Get id of disconnected agent
        const targetAgentARN = event.detail.agentInfo.agentArn;
        // console.log("Disconnected agent ARN: ", targetAgentARN);
        logger.debug(`Disconnected agent ARN: ${targetAgentARN}`);
        const targetAgentId = targetAgentARN.split('/').pop();
        // console.log("Disconnected agent Id: ", targetAgentId);
        logger.debug(`Disconnected agent Id: ${targetAgentId}`);

        count = 0;
        //Remove specific agent which is disconnected
        let agentParticipantId;
        logger.info(`Finding disconnected agent from conversation...`);
        let specificAgent = conversation.participant.filter((att) => {
            if (att.participantType === 'Agent' && att.isActive === true && att.agentArn === targetAgentId) {
                return att;
            }
        });
        specificAgent = specificAgent[0];

        // console.log("Specific Agent ::", specificAgent);
        if (specificAgent) {
            logger.debug(`Disconnected Agent found :: ${specificAgent}`);
        } else {
            logger.warn(`Unable to find disconnected agent...`);
        }


        agentParticipantId = specificAgent.id;

        logger.info(`Removing disconnected agent from conversation...`);
        response = await axios.delete(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}&participantId=${agentParticipantId}`);
        logger.debug(`Disconnected agent removed from conversation: ${response}`);

        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        // console.log("Conversation after deleting participant: ", conversation);
        logger.debug(`onversation after deleting participant: ${conversation}`);

        //Get participant list after deleting participant
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        // console.log("Participant List after deleting participant: ", participantList);
        logger.debug(`Participant List after deleting participant: ${participantList}`);
        //const listCount = 0;

        logger.info(`Finding that agent is in conversation or not to end the conversation...`);
        const list = participantList.find((att) => {
            if (att.participantType === 'Agent' && att.isActive === true) {
                logger.info(`Agent exists in conversation, conversation is active...`);
                return att;
            }

        });

        if (!list) {
            logger.info(`No agent in conversation. End the conversation...`);
            response = await axios.put(`https://421bb5xi6f.execute-api.us-east-1.amazonaws.com/prod/updateconversationstate?contactId=${contactId}`);
        }
    }

    //Normal OUTBOUND Conversation
    else if (event.detail.channel == "VOICE" && event.detail.eventType == "CONNECTED_TO_AGENT" && event.detail.initiationMethod == "OUTBOUND") {
        logger.info(`Agent 1 connected to the call we are going to add this agent in conversation...`);
        //console.log("Event detail: ",JSON.stringify(event));
        contactId = event.detail.contactId; //get contact id

        const agentArn = event.detail.agentInfo.agentArn;
        agentId = agentArn.split('/').pop();
        logger.debug(`Connected agent ARN: ${agentArn}`);
        logger.debug(`Connected agent Id: ${agentId}`);

        //get conversation by id when any event occur but first event is initiated
        logger.debug(`Finding Conversation against contact id: ${contactId}`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        logger.debug(`Conversation in connected to agent event: ${conversation}`);
        logger.debug(`Conversation id in connected to agent event: ${conversationId}`);

        //Get Participant List
        logger.info(`Getting participant list from conversation...`);
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        logger.debug(`Participant List: ${participantList}`);
        logger.info(`Finding connected agent already in conversation or not...`);

        const agentArns = new Set(participantList.map(participant => participant.agentArn));
        agentExists = agentArns.has(agentId);

        if (agentExists) {
            logger.info(`Connected agent is already exist in conversation.`);
        }
        else {
            logger.info(`Agent does not exist. Add this agent.`);
            //add participant
            const data = {
                participantType: "Agent",
                agentArn: agentId,
                isActive: true,
                participantRole: "Primary"
            };
            logger.debug(`Connected agent details: ${data}`);

            //Add participant using agent arn with axios call
            //const addParticipant = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${contactId}`, data);
            logger.info(`Adding paricipant in conversation...`);
            response = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`, data);
            if (response) {
                logger.debug(`Participant added successfully: ${response.data}`);
            } else {
                logger.error(`Error adding participant in conversation...`);
            }
        };


    }


    else if (event.detail.channel == "VOICE" && event.detail.eventType == "DISCONNECTED" && event.detail.initiationMethod == "OUTBOUND") {
        logger.info(`Agent 1 disconnected from call we are going to remove this agent from conversation...`);
        contactId = event.detail.contactId;

        logger.info(`Finding conversation in disconnected event...`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        logger.debug(`Conversation before remove agent is: ${conversation}`);
        logger.debug(`Conversation id: ${conversationId}`);

        //Get participant list after deleting participant

        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        logger.debug(`Participant List before deleting participant in outbound disconnected event: ${participantList}`);

        //Get id of disconnected agent
        const targetAgentARN = event.detail.agentInfo.agentArn;
        const targetAgentId = targetAgentARN.split('/').pop();
        logger.debug(`Disconnected agent ARN: ${targetAgentARN}`);
        logger.debug(`Disconnected agent Id: ${targetAgentId}`);

        //Remove specific agent which is disconnected
        logger.info(`Finding disconnected agent from conversation...`);
        let agentParticipantId;
        let specificAgent = conversation.participant.filter((att) => {
            if (att.participantType === 'Agent' && att.isActive === true && att.agentArn === targetAgentId) {
                return att;
            }
        });
        specificAgent = specificAgent[0];
        if (specificAgent) {
            logger.debug(`Disconnected Agent found :: ${specificAgent}`);
        } else {
            logger.warn(`Unable to find disconnected agent...`);
        }

        agentParticipantId = specificAgent.id;
        logger.info(`Removing disconnected agent from conversation...`);

        response = await axios.delete(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}&participantId=${agentParticipantId}`);
        logger.debug(`Disconnected agent removed from conversation: ${response}`);

        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        logger.debug(`Conversation after deleting participant: ${conversation}`);

        //Get participant list after deleting participant
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        logger.debug(`Participant List after deleting participant: ${participantList}`);
        //const listCount = 0;

        logger.info(`Finding that agent is in conversation or not to end the conversation...`);
        const list = participantList.find((att) => {
            if (att.participantType === 'Agent' && att.isActive === true) {
                logger.info(`Agent exists in conversation, conversation is active...`);
                return att;
            }

        });

        if (!list) {
            logger.info(`No agent in conversation. End the conversation...`);
            response = await axios.put(`https://421bb5xi6f.execute-api.us-east-1.amazonaws.com/prod/updateconversationstate?contactId=${contactId}`);
        }
    }

    //Transfer Case:
    else if (event.detail.channel == "VOICE" && event.detail.eventType == "CONNECTED_TO_AGENT" && event.detail.initiationMethod == "TRANSFER") {
        logger.info(`Another connected to the call we are going to add this agent in conversation...`);
        //console.log("Event detail: ",JSON.stringify(event));
        contactId = event.detail.initialContactId; //get contact id
        //logger.debug(`Initial Contact id: ${contactId}`);
        const agentArn = event.detail.agentInfo.agentArn;
        agentId = agentArn.split('/').pop();
        logger.debug(`Connected agent ARN: ${agentArn}`);
        logger.debug(`Connected agent Id: ${agentId}`);

        //get conversation by id when any event occur but first event is initiated
        logger.debug(`Finding Conversation against contact id: ${contactId}`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        logger.debug(`Conversation in connected to agent event: ${conversation}`);
        logger.debug(`Conversation id in connected to agent event: ${conversationId}`);

        //Get Participant List
        logger.info(`Finding participant list from conversation...`);
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        logger.debug(`Participant List: ${participantList}`);

        //agentExists = participantList.find(participant => participant.participantType === "Agent" && participant.agentArn === agentId);
        logger.info(`Finding connected agent already in conversation or not...`);
        const agentArns = new Set(participantList.map(participant => participant.agentArn));
        agentExists = agentArns.has(agentId);

        if (agentExists) {
            logger.info(`Connected agent is already exist in conversation.`);
        }
        else {
            logger.info(`Agent does not exist. Add this agent.`);
            //add participant
            const data = {
                participantType: "Agent",
                agentArn: agentId,
                isActive: true,
                participantRole: "Primary"
            };
            logger.debug(`Connected agent details: ${data}`);

            //Add participant using agent arn with axios call
            //const addParticipant = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${contactId}`, data);
            logger.info(`Adding paricipant in conversation...`);
            response = await axios.post(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`, data);
            if (response) {
                logger.debug(`Participant added successfully: ${response.data}`);
            } else {
                logger.error(`Error adding participant in conversation...`);
            }

        }


    }

    else if (event.detail.channel == "VOICE" && event.detail.eventType == "DISCONNECTED" && event.detail.initiationMethod == "TRANSFER") {
        logger.info(`An agent is disconnected from call we are going to remove this agent from conversation...`);
        contactId = event.detail.initialContactId;
        logger.debug(`Initial contact id: ${contactId}`);

        logger.info(`Finding conversation in disconnected event...`);
        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        conversationId = conversation._id;
        logger.debug(`Conversation before remove agent is: ${conversation}`);
        logger.debug(`Conversation id: ${conversationId}`);

        //Get participant list after deleting participant
        logger.info(`Finding participant list from conversation...`);
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;
        logger.debug(`Participant List before deleting participant in inbound disconnected : ${participantList}`);

        //Get id of disconnected agent
        const targetAgentARN = event.detail.agentInfo.agentArn;
        const targetAgentId = targetAgentARN.split('/').pop();
        logger.debug(`Disconnected agent ARN: ${targetAgentARN}`);
        logger.debug(`Disconnected agent Id: ${targetAgentId}`);

        //Remove specific agent which is disconnected
        //count = 0;
        let agentParticipantId;

        logger.info(`Finding disconnected agent from conversation...`);
        let specificAgent = conversation.participant.filter((att) => {
            if (att.participantType === 'Agent' && att.isActive === true && att.agentArn === targetAgentId) {
                return att;
            }
        });
        specificAgent = specificAgent[0];
        if (specificAgent) {
            logger.debug(`Disconnected Agent found :: ${specificAgent}`);
        } else {
            logger.warn(`Unable to find disconnected agent...`);
        }

        agentParticipantId = specificAgent.id;

        logger.info(`Removing disconnected agent from conversation...`);
        response = await axios.delete(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}&participantId=${agentParticipantId}`)
        logger.debug(`Disconnected agent removed from conversation: ${response}`);

        conversation = await axios.get(`https://0nqm2etj9j.execute-api.us-east-1.amazonaws.com/prod/getconversationbycontactid?contactId=${contactId}`);
        conversation = conversation.data;
        logger.debug(`Conversation after deleting participant: ${conversation}`);

        //Get participant list after deleting participant
        logger.debug(`Participant List after deleting participant: ${participantList}`);
        participantList = await axios.get(`https://54lot78qha.execute-api.us-east-1.amazonaws.com/prod/participent?conversationId=${conversationId}`);
        participantList = participantList.data;

        logger.info(`Finding that agent is in conversation or not to end the conversation...`);
        const list = participantList.find((att) => {
            if (att.participantType === 'Agent' && att.isActive === true) {
                logger.info(`Agent exists in conversation, conversation is active...`);
                return att;
            }

        });

        if (!list) {
            logger.info(`No agent in conversation. End the conversation...`);
            response = await axios.put(`https://421bb5xi6f.execute-api.us-east-1.amazonaws.com/prod/updateconversationstate?contactId=${contactId}`);
        }

    }


};
