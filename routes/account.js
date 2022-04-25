var express = require('express');
var router = express.Router();
const db = require('../middleware/db');
const decode = require('../middleware/token');
const jwt = require('jsonwebtoken');
const secret = require('../config/tokenkey');
const defaultprofilepicture = require('../config/defaultImage');


/**
 * @swagger
 * /signin:
 *    post:
 *      tags:
 *      - account
 *      summary: 로그인
 *      description: 
 *      produces:
 *      - application/json
 *      parameters:
 *        - in: body
 *          name: signin
 *          required: true
 *          schema:
 *            $ref: '#/definitions/signinRequest'
 *      responses:
 *       200:
 *        description: 로그인 성공
 *        schema:
 *          properties:
 *            status:
 *              type: integer
 *              example: 200
 *            msg:
 *              type: string
 *              example: 로그인 성공
 *            data:
 *              type: string
 *       403:
 *        description: 로그인 실패
 *        schema:
 *          properties:
 *            status:
 *              type: integer
 *              example: 403
 *            msg:
 *              type: string
 *              example: 로그인 실패
 */
router.post('/signin', async(req,res,next) => {
    try {
        const sql = "SELECT id FROM account WHERE id=? AND pw=?"
        const params = [req.body.id, req.body.pw]
        var result = (await db.executePreparedStatement(sql,params)).rows;
        // console.log(result)
        if (!result||result.length==0){
            res.status(403).
            json({
                status:res.statusCode,
                msg:'로그인 실패',
            });
        }   
        else {
            var user = {
                sub: req.body.id,
                iat: new Date().getTime() / 1000
            };
            var token = jwt.sign(user, secret, {
                expiresIn: "128H"
            })
            res.status(200).json({
                status:res.statusCode,
                msg: "로그인 성공",
                data: token,
            });
        }
    } catch (error) {
        error.status=400;
        next(error);
    }
})


/**
 * @swagger
 * /signup:
 *   post:
 *     tags:
 *     - account
 *     summary: 회원가입
 *     description: 
 *     produces:
 *     - application/json
 *     parameters:
 *       - in: body
 *         name: signup
 *         required: true
 *         schema: 
 *           $ref: '#/definitions/signupRequest'
 *     responses:
 *       200:
 *         description: 성공
 *         schema:
 *           properties:
 *             status:
 *               type: integer
 *               example: 200
 *             msg:
 *               type: string
 *               example: 회원가입 성공
 *             data:
 *               type: string
 *             
 *               
 */
router.post('/signup', async(req,res,next) => {
    try {
        const sql ="INSERT INTO account (ID, PW, phonenum, nickname,profile) VALUES(?,?,?,?,?)";
        const params = [req.body.id, req.body.pw, req.body.phonenum, req.body.nickname, defaultprofilepicture];
        await db.executePreparedStatement(sql,params);
        var user = {
            sub: req.body.id,
            iat: new Date().getTime() / 1000
        };
        var token = jwt.sign(user, secret, {
            expiresIn: "128H"
        })
        res.status(200).json({
            status:res.statusCode,
            msg: "회원가입 성공",
            data: token,
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})

/**
 * @swagger
 * 
 * /check:
 *  post:
 *    tags:
 *    - account
 *    summary: 아이디 중복체크
 *    description:
 *    produces:
 *    - application/json
 *    parameters:
 *    - in: body
 *      name: checks
 *      required: true
 *      schema:
 *        $ref: '#/definitions/idCheckRequest'
 *    responses:
 *      200:
 *          description: 사용가능
 *          schema:
 *            type: object
 *            properties:
 *              status:
 *                type: integer
 *                example: 200
 *              msg:
 *                type: string
 *                example: available
 *              data:
 *                type: string
 *                example: available
 *      201:
 *          description: 사용 불가능
 *          schema:
 *            type: object
 *            properties:
 *              status:
 *                type: integer
 *                example: 201
 *              msg:
 *                type: string
 *                example: exist
 *              data:
 *                type: string
 *                example: exist
 */
router.post('/check', async (req,res,next) => {
    try {
        const sql = "SELECT ID FROM account WHERE ID = ?";
        const params =  [req.body.id];
        var result = (await db.executePreparedStatement(sql,params)).rows
        if (!result || result.length==0) {
            res.status(200)
            .json({
                status:res.statusCode,
                msg:"available",
                data:"available"
            });
        }
        else res.status(201)
        .json({
            status:res.statusCode,
            msg:"exist",
            data:"exist"
        });
    } catch (error) {
        error.status=400;
        next(error);
    }
})

/**
 * @swagger
 * /charge:
 *  put:
 *    tags:
 *    - account
 *    summary: 충전
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
 *    - in: body    
 *      name: charge
 *      required: true
 *      schema:
 *        $ref: '#/definitions/chargeRequest'
 * 
 *    responses:
 *      200:
 *        description: 송금성공
 *        schema:
 *          properties:
 *            status:
 *              type: integer
 *              example: 200
 *            msg:
 *              type: string
 *              example: success
 *  
 */
router.put('/charge',decode,async(req,res,next)=>{
    try {
        const sql = "UPDATE account SET cash = account.cash + ? WHERE id = ?";
        const params = [req.body.cash,req.token.sub];
        //console.log(params,sql);
        await db.executePreparedStatement(sql,params)
        res.status(200).json({
            status:res.statusCode,
            msg:"success"
        })
    } catch (error) {
        error.status=400;
        next(error);
    }
})


module.exports = router;