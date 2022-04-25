var express = require('express');
var router = express.Router();
const db = require('../middleware/db');
const decode = require('../middleware/token');

/**
 * @swagger
 * /prize/{contestId}:
 *  put:
 *    tags:
 *    - prize
 *    summary: 우승자 결정
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
 * 
 *    - in: body
 *      name: body
 *      required: ture
 *      schema:
 *        $ref: '#/definitions/putPrizeRequest'
 * 
 *    responses:
 *      200:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: integer
 *              example: 200
 *            msg:  
 *              type: string
 *              example: success
 */
router.put('/:id',decode,async(req,res,next)=>{
    
    try {
        await db.executePreparedStatement('start transaction',[]);
        console.log(req.body);
        const sql="UPDATE prize SET participant_ID = ? WHERE contest_ID = ? AND rank = ?";
        for(let x of req.body){
            let params = [x.participantID ,req.params.id ,x.rank];
            await db.executePreparedStatement(sql,params);
            const sql2 = "UPDATE account SET cash = account.cash + (select price from prize where prize.contest_ID = ? and prize.rank =?) WHERE id = (select account.id from account left join participant on account.ID =participant.account_ID where participant.ID = ?)"
            await db.executePreparedStatement(sql2,[req.params.id,x.rank,x.participantID])
        }
        await db.executePreparedStatement('commit')
        res.status(200).json({
            status:res.statusCode,
            msg:'success'
        });
    } catch (error) {
        await db.executePreparedStatement('rollback')
        error.status=400;
        next(error);
    }
})

/**
 * @swagger
 * /prize/{contestId}:
 *  get:
 *    tags:
 *    - prize
 *    summary: 수상자 조회
 *    description:
 *    produces:
 *      application/json
 *      
 *    parameters:
 *    - in: header
 *      name: authorization
 *      required: true
 *      schema:
 *        $ref: '#/definitions/header' 
 *    - in: path
 *      name: contestId
 *      required: true
 *      type: integer
 *      minimum: 1  
 *  
 *    responses:
 *      200:
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
 *              $ref: '#/definitions/getPrizeResponse'
 */
router.get('/:id',decode,async(req,res,next)=>{
    try {
        const sql=" SELECT prize.price, prize.rank, prize.participant_ID, account.nickname, account.profile, participant.ID AS participant_ID FROM prize left join participant on prize.participant_ID = participant.ID left join account on participant.account_ID=account.ID WHERE prize.contest_ID = ? ORDER BY prize.rank";
        const params=[req.params.id];
        const result = (await db.executePreparedStatement(sql,params)).rows;
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

module.exports = router;