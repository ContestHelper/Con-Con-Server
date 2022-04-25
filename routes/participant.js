var express = require('express');
var router = express.Router();

const decode = require('../middleware/token')
const db = require('../middleware/db');
const upload = require('../middleware/fileload')

/**
 * @swagger
 * /participant/{contestId}:
 *  post:
 *    tags:
 *    - participant
 *    summary: 대회 참여작 생성
 *    description:
 *    produces:
 *    - application/json
 *    consumes:
 *    - multipart/form-data    
 * 
 *    parameters:
 *    - in : header
 *      name: Authorization
 *      required: true
 *      schema:
 *        $ref: '#/definitions/header'
 *   
 * 
 *    - in: formData
 *      name: attachment
 *      type: file
 *      description: the file to upload
 *      required: true
 * 
 *    - in: formData
 *      name: attachment
 *      type: file
 *      description: the file to upload
 *      required: false
 * 
 *    - in: formData
 *      name: attachment
 *      type: file
 *      description: the file to upload
 *      required: false
 * 
 *    
 *    - in: body
 *      name: participant
 *      required: true
 *      schema: 
 *        $ref: '#/definitions/createParticipantRequest'
 * 
 *    responses:
 *      200:
 *        description: 생성 성공
 *        schema:
 *          type: object
 *          properties:
 *            status: 
 *              type: integer
 *              example: 200
 *            msg:
 *              type: string
 *              example: success  
 *    
 * 
 */
router.post('/:id',upload.array('attachment'), decode, async (req,res,next)=> {
    let conn;
    try {
        conn =await db.getConnection().getConnection();
        await conn.beginTransaction();
        var sql = "INSERT INTO participant (account_ID, contest_ID, content) VALUES (?,?,?)";
        var params = [req.token.sub,parseInt(req.params.id), req.body.content];
        const [field] = (await conn.query(sql,params));
        if(!req.files){
            req.files=[];
        }
        if (req.files.length > 0) {
            var sql = "INSERT INTO participant_file (participant_ID, URL) VALUES ?";
            var params = [];
            for (var x in req.files) {
                params.push([field.insertId, "images/participant/" + req.files[x].filename])
            }
            console.log(params);
            await conn.query(sql,[params]);
        }
        conn.commit();
        res.status(200).json({
            status:res.statusCode,
            msg:'success'
        });
    } catch (error) {
        await conn.rollback();    
        error.status=400;
        next(error);
    }
});


/**
 * @swagger
 * /participant/{contestId}:
 *  get:
 *    tags:
 *    - participant
 *    summary: 참여자 조회
 *    description:
 *    produces:
 *    - application/json
 * 
 *    parameters:
 *    - in: header
 *      name: Authorization
 *      required: true
 *      schema: 
 *        $ref: '#/definitions/header'
 *   
 *    - in: path
 *      name: contestId
 *      required: true
 *      type: integer
 *      minimum: 1
 *      description: Parameter to find participant
 * 
 *    responses:
 *      200:
 *        description: 참여자 조회 성공
 *        schema:
 *          type: object   
 *          properties:
 *            status:
 *              type: integer
 *              example: 200
 *            msg:
 *              type: string
 *              example: 조회성공
 *            data:
 *              $ref: '#/definitions/findAllParticipantRequest'
 */
router.get('/:id',async(req,res,next)=>{
    try {
        const sql = "SELECT participant.ID, account.profile, account.nickname, count(likes.account_ID) AS likes, participant.content, GROUP_CONCAT(participant_file.URL ORDER BY participant_file.ID)AS URL FROM participant LEFT JOIN account ON participant.account_ID = account.ID LEFT JOIN participant_file ON participant.ID = participant_file.participant_ID LEFT JOIN likes ON participant.ID = likes.participant_ID WHERE participant.contest_ID = ? GROUP BY participant.ID ORDER BY participant.ID;";
        const params= [parseInt(req.params.id)];
        const result = (await db.executePreparedStatement(sql,params)).rows;
        for(var x in result){
            if(typeof result[x].URL=="string")
            result[x].URL=result[x].URL.split(',');
            else
            result[x].URL=[];
        }
        res.status(200).json({
            status:res.statusCode,
            msg:"조회성공",
            data:result
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})

/**
 * @swagger
 * /participant/{contestId}/{participantId}:
 *  put:
 *    tags:
 *    - participant
 *    summary: 참가자 좋아요
 *    description:
 *    produces:
 *    - application/json
 *    
 *    parameters:
 *    - in: header
 *      name: Authorization
 *      require: ture
 *      schema:
 *        $ref: '#/definitions/header' 
 * 
 *    - in: path
 *      name: contestId
 *      required: true
 *      type: integer
 *      minimum: 1
 *      description: Parameter to find participant
 *      
 *    - in: path
 *      name: participantId
 *      required: true
 *      type: integer
 *      minimum: 1
 *      description: Parameter to find participant
 * 
 *    responses:
 *      200:
 *        description: 좋아요 처리 완료
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: integer
 *              example: 200
 *            msg:
 *              type: string
 *              example: like added
 */
router.put('/:cont/:part',decode, async(req,res,next)=>{
    try {
        var sql = "SELECT id FROM likes WHERE account_ID=? AND contest_ID=? AND participant_ID=?";
        const params = [req.token.sub, parseInt(req.params.cont),parseInt(req.params.part)];
        var result = (await db.executePreparedStatement(sql,params)).rows;
        var msg='';
        if(result.length==0){
            sql = 'INSERT INTO likes (account_ID, contest_ID, participant_ID) VALUES(?,?,?)';
            msg = 'like added'
        }
        else{
            sql = 'DELETE FROM likes WHERE account_ID=? AND contest_ID=? AND participant_ID=?'
            msg = 'like deleted'
        }
        await db.executePreparedStatement(sql,params);
        res.status(200).json({
            status:res.statusCode,
            msg
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})

module.exports = router;