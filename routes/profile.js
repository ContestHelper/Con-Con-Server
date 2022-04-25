var express = require('express');
var router = express.Router();

const decode = require('../middleware/token')
const db = require('../middleware/db');
const upload = require('../middleware/fileload')

/**
 * @swagger
 * /profile:
 *  get:
 *    tags:
 *    - profile
 *    summary: 프로필 조회
 *    description: 
 *    produces:
 *    - application/json
 *      
 *    parameters:
 *    - in: header
 *      name: Authorization
 *      require: true
 *      schema:
 *        $ref = "#/definitions/header"
 *    
 *    responses:
 *      200:
 *        descriptions: profile
 *        schema:
 *          type: object
 *          properties:
 *            status:   
 *              type: string
 *              example: 200
 *            msg:
 *              type: string
 *              example: 프로필 조회 성공
 *            data:
 *              $ref: '#/definitions/getProfileResponse'
 *  
 */
router.get('/',decode,async(req,res,next)=>{
    //console.log(req.token);
    try {
        const sql = "SELECT nickname,cash,profile FROM account WHERE id = ?";
        const params = [req.token.sub];
        const result =(await db.executePreparedStatement(sql,params)).rows[0];
        res.json({
            status: res.statusCode,
            msg:"프로필 조회 성공",
            data:result
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})


/**
 * @swagger
 * /profile:
 *  put:
 *    tags:
 *    - profile
 *    summary: 프로필 사진 업로드
 *    description:
 *    produces:
 *    - application/json
 *    consumes:
 *    - multipart/form-data   
 *    
 *    parameters:
 *    - in: header
 *      name: Authorization
 *      require: true
 *      schema:
 *        $ref: '#/definitions/header'
 * 
 *    - in: formData
 *      name: attachment
 *      type: file
 *      description: The file to upload
 *    
 *    responses:
 *      200:
 *        description: 업로드 성공
 *        schema:
 *          type: object
 *          properties:
 *              status:
 *                type: int
 *                example: 200
 *              msg:        
 *                type: string  
 *                example: success
 *  
 */
router.put('/',decode,upload.single('attachment') ,async(req,res,next)=>{
    try {
        const sql = 'UPDATE account SET profile = ? WHERE ID = ?';
        const params = ["images/profile/"+req.file.filename, req.token.sub];
        await db.executePreparedStatement(sql,params);
        res.status(200).json({
            status: res.statusCode,
            msg:"success"
        })
    } catch (error) {
        error.status=400;
        next(error);
    }
})


/**
 * @swagger
 * /profile/contest:
 *  get:
 *    tags:
 *    - profile
 *    - contest
 *    summary: 참가한 대회 조회
 *    description:
 *    produces:
 *    - application/json
 * 
 *    parameters:
 *    - in: body
 *      name: Authorization
 *      require: true
 *      schema:
 *        $ref: '#/definitions/header'
 *    
 *    responses:
 *      200:
 *        description: contests
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
 *              $ref: '#/definitions/findOneContestResponse'
 *          
 * 
 * 
 */     
router.get('/contest',decode,async(req,res,next)=>{
    try {
        const sql = "select contest.ID ,contest.title ,contest.content ,contest.startdate ,contest.duedate ,account.nickname as host, account.profile ,if(account.ID = ?,'T','F')AS isHost, group_concat(distinct concat(prize.price,' ',prize.rank) order by prize.ID)as prize from participant left join contest on participant.contest_ID =contest.ID left join account on participant.account_ID =account.ID left join prize on contest.ID = prize.contest_ID where participant.account_ID =? group by contest.ID ORDER BY contest.ID desc";
        const params = [req.token.sub, req.token.sub];
        var result = (await db.executePreparedStatement(sql,params)).rows
        //console.log(result)
        if (result.length < 1) {
            res.status(400).json({ 'less': 'less' });
            return;
        }
        for (var x in result) {
            result[x].prize = result[x].prize.split(',');
            var arr = [];
            for (var xx in result[x].prize) {
                var target = result[x].prize[xx].split(' ');
                arr.push({
                    price: target[0],
                    rank: target[1]
                });
            }
            result[x].prize = arr;

            if(result[x].isHost=='T'){//isHost boolean으로 바꾸는 과정
                result[x].isHost=true;
            }else{
                result[x].isHost=false;
            }
        }
        res.status(200).json({
            status:res.statusCode,
            msg: "조회 성공",
            data:result
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})

module.exports=router;