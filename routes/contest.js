    var express = require('express');
    var router = express.Router();
    const db = require('../middleware/db');
    const decode = require('../middleware/token');
    const upload = require('../middleware/fileload')

    /**
     * @swagger
     * 
     * /contest:
     *  post:
     *    tags:
     *    - contest
     *    summary: 대회생성
     *    description: 
     *    produces:
     *    -application/json
     *    consumes:
     *    - multipart/form-data
     * 
     *    parameters:
     *    - in: header
     *      name: Authorization
     *      required: true
     *      schema:
     *        $ref: '#/definitions/header'
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
     *    - in: formData
     *      name: attachment
     *      type: file
     *      description: the file to upload
     *      required: false
     *
     *    - in: body
     *      name: contest
     *      required: true
     *      schema:
     *        $ref: '#/definitions/createContestRequest'
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
     */
    router.post('/', decode, upload.array('attachment'), function (req, res, next) {
        // req.body=JSON.parse(req.body)
        let conn;
        const contestInsert = () => {
            const promise = new Promise(async (resolve, reject) => {
                //console.log(req.body);
                try {
                    conn = await db.getConnection().getConnection();
                    //console.log(conn);
                    await conn.beginTransaction();
                    var c = await conn.query("INSERT INTO contest(title,content,startdate,duedate,host) VALUES (?,?,?,?,?)",
                    [req.body.title, req.body.content, req.body.startdate, req.body.duedate, req.token.sub])
                    resolve(c[0].insertId)
                } catch (error) {
                    reject(error)
                }
            })
            return promise;
        }
        const prizeInsert = (result) => {
            const promise = new Promise(async (resolve, reject) => {
                if(typeof req.body.prize == "string" ){
                    req.body.prize==JSON.parse(req.body.prize);
                }
                // for (const i in req.body.prize) {
                //   req.body.prize[i] = JSON.parse(req.body.prize);
                //   console.log(req.body.prize[i]);
                // }
                
                console.log(req.body);
                var arr = [];
                for (var x in req.body.prize) {
                    arr.push([req.body.prize[x].price, req.body.prize[x].rank, result]);
                }
                try {
                    await conn.query("INSERT INTO prize (price,rank,contest_ID) VALUES ?", [arr])
                    resolve(result);
                } catch (error) {
                    reject(error)
                }
            })
            return promise;
        }
        const contest_fileInsert = (result) =>{
            const promise = new Promise(async(resolve,reject)=>{
                if(!req.files){
                    resolve();
                }
                try {
                    if (req.files.length > 0) {
                        var sql = "INSERT INTO contest_file (contest_ID, URL) VALUES ?";
                        var params = [];
                        for (var x in req.files) {
                            params.push([result, "images/contest/" + req.files[x].filename])
                        }
                        // console.log(params);
                        await conn.query(sql,[params]);
                    }
                    resolve();  
                } catch (error) {
                    reject(error);
                }
            })
            return promise
        }
        const respond = async () => {
            conn.query("COMMIT");
            res.status(200).json({
                status: res.statusCode,
                msg:"success"
            });
        }
        const error = async (err) => {
            conn.query("ROLLBACK")
            err.status=400;
            next(err);
        }

        contestInsert()
            .then(prizeInsert)
            .then(contest_fileInsert)
            .then(respond)
            .catch(error);
    });


    /**
     * @swagger
     * /contest:
     *  get:
     *    tags:
     *    - contest
     *    summary: 대회 전체 조회
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
     *              example: 대회 전체 조회 성공
     *            data:
     *              $ref: '#/definitions/findAllContestResponse'
     */
    router.get('/', decode, async (req, res,next) => {
        const sql = "SELECT contest.ID,title,content,startdate,duedate,nickname AS host, profile,if(account.ID = ?,'T','F')AS isHost, group_concat(concat(prize.price,' ',prize.rank) ORDER BY prize.ID)AS prize , group_concat(distinct contest_file.URL) AS URL FROM contest left join account on contest.host = account.ID left join prize ON contest.ID = prize.contest_ID left join contest_file ON contest.ID = contest_file.contest_ID WHERE duedate>NOW() GROUP BY contest.ID ORDER BY contest.ID desc"
        const params=[req.token.sub]
        try {
            var result = (await db.executePreparedStatement(sql,params)).rows
            // console.log(result)
            for (var x in result) {
                if(typeof result[x].prize == 'string'){
                    result[x].prize = result[x].prize.split(',');//przie 자르는 과정
                    var arr = [];
                    for (var xx in result[x].prize) {
                        var target = result[x].prize[xx].split(' ');
                        arr.push({
                            price: target[0],
                            rank: target[1]
                        });
                    }
                    result[x].prize = arr;
                }
                if(result[x].isHost=='T'){//isHost boolean으로 바꾸는 과정
                    result[x].isHost=true;
                }else{
                    result[x].isHost=false;
                }
                if (typeof result[x].URL == "string")
                result[x].URL = result[x].URL.split(",");
                else 
                result[x].URL = [];
            }
            res.status(200).json({
                status: res.statusCode,
                msg:"대회 전체 조회 성공",
                data:result
            });
        } catch (error) {
            error.status=400;
            next(error);
        }
    })


    /**
     * @swagger
     * /contest/{contestId}:
     *  get:
     *    tags:
     *    - contest
     *    summary: 대회 검색
     *    description:
     *    produces:
     *    - applicaiton/json
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
     *      description: Parameter to find contest
     *    responses:
     *      200:
     *        description: 대회 조회 성공
     *        schema:
     *          type: object
     *          properties:
     *            status:
     *              type: integer
     *              example: 200
     *            msg:
     *              type: string
     *              example: 대회 검색 성공
     *            data:
     *              $ref: '#/definitions/findOneContestResponse'
     *        
     */
    router.get('/:id', decode, async (req, res,next) => {
        const sql = "SELECT contest.ID,title,content,startdate,duedate,nickname AS host, profile, if(account.ID = ?,'T','F') AS isHost, group_concat(concat(prize.price,' ',prize.rank) ORDER BY prize.ID)AS prize, group_concat(distinct contest_file.URL) AS URL FROM contest left join account on contest.host = account.ID left join prize ON contest.ID = prize.contest_ID left join contest_file ON contest.ID = contest_file.contest_ID WHERE contest.ID = ? GROUP BY contest.ID "
        
        const params =  [req.token.sub,req.params.id];
        try {
            var result = (await db.executePreparedStatement(sql,params)).rows
            // console.log(result)
            if (result.length < 1) {
                res.status(400).json({ 'less': 'less' });
                return;
            }
            result = result[0]
            result.prize = result.prize.split(',');
            //console.log(result.prize);
            var arr = [];
            for (var x in result.prize) {
                var target = result.prize[x].split(' ');
                arr.push({
                    price: target[0],
                    rank: target[1]
                });
            }
            result.prize = arr;
            if(result.isHost=='T'){
                result.isHost=true;
            }else{
                result.isHost=false;
            }
            if (typeof result.URL == "string")
                result.URL = result.URL.split(",");
            else 
                result.URL = [];
            res.status(200).json({
                status:res.statusCode,
                msg:'대회 검색 성공',
                data:result,
            });
        } catch (error) {
            error.status=400;
            next(error);
        }

    })

    /**
     * @swagger
     * /contest/{contestId}:
     *  put:
     *    tags:
     *    - contest
     *    summary: 대회 수정
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
     *      description: Parameter to edit contest
     * 
     *    - in: body
     *      name: contestbody
     *      required: ture
     *      schema: 
     *        $ref: '#/definitions/editContestRequest'
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
        //console.log(req.body);
        try {
            const sql= "UPDATE contest SET title = ?, content = ?, startdate = ?, duedate = ? WHERE id = ?";
            const params=[req.body.title, req.body.content, req.body.startdate, req.body.duedate, req.params.id];
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

    module.exports = router;