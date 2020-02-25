const Post = require('../models/Post');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cv = require('opencv4nodejs');
const brain = require('brain.js');

// Função que realiza o treinamento da RNA.
async function getTrain() {
	//Criou a rede neural
	const net = new brain.NeuralNetworkGPU();
	//pegou os dados do banco
	console.log("Buscando dados");
	const response = await Post.find().sort('createdAt');
    
    //Transformei os dados em array e atribui no array 'datas'
	const datas = [];
	response.map(function(element) {
		datas.push(element.toJSON());
	});

    //Processo para montar o dados de treinamento para a RNA
	const trainingData = [];

	for (let i = 0; i < datas.length; i++) {

		if (datas[i].sign == 'a') {
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { a : 1 }
			});	
		} else if (datas[i].sign == 'b'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { b : 1 }
			});	
		} else if (datas[i].sign == 'c'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { c : 1 }
			});	
		} else if (datas[i].sign == 'd'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { d : 1 }
			});	
		} else if (datas[i].sign == 'e'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { e : 1 }
			});	
		} else if (datas[i].sign == 'f'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { f : 1 }
			});	
		} else if (datas[i].sign == 'g'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { g : 1 }
			});	
		} else if (datas[i].sign == 'i'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { i : 1 }
			});	
		} else if (datas[i].sign == 'l'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { l : 1 }
			});	
		} else if (datas[i].sign == 'v'){
			trainingData.push({
				input: datas[i].binarry.data, 
				output: { v : 1 }
			});	
		}
		
	}

	console.log('começando o treinamento');
    console.time('process');
	net.train(trainingData, {	log: (error) => console.log(error), 
								iterations: 500,
								activation: 'sigmoid',
								learningRate: 0.3,
								hiddenLayers: [3267, 3267, 3267]
                            });
                
    console.timeEnd('process');
    console.log('Teste para identificar a letra: '+ datas[1].sign);
	const uput = net.run(datas[1].binarry.data);
    console.log('Resultado:');
    console.log(uput);
	return net;
}

getTrain().then((result) => {
    console.log('Termino da RNA');
});


module.exports = {
    async index(req, res) {
        //Ao buscar, ele irá ordenar em ordem crescente referente a data de criação
        const posts = await Post.find().sort('createdAt');

        return res.json(posts);
    }, 

    // Função que realiza o tratamento da imagem recebida, faz o processamento da imagem e salva alguns dados no banco de dados.
    async store(req, res) {
        const { sign } = req.body;
        const { filename: image } = req.file;

        const [name] = image.split('.');
        const fileName = `${name}.jpg`;

//------------------------PROCESSAMENTO DE IMAGEM-------------------------// 
        // Margem da cor da pele
        const skinColorUpper = hue => new cv.Vec(hue, 1.1 * 255, 1.1 * 255); //0.8 * 255, 0.6 * 255
        const skinColorLower = hue => new cv.Vec(hue, 0.1 * 255, 0.05 * 255);

        const mat = cv.imread(req.file.path);
        // Converte a imagem para HLS
        const imgHLS = mat.cvtColor(cv.COLOR_BGR2HLS);
        
        // Cria a rangeMask
        const rangeMask = imgHLS.inRange(skinColorLower(0), skinColorUpper(24));

        // Remove o ruido
        const blurred = rangeMask.blur(new cv.Size(10, 10));
        
        // Cria a mascara binário, a partir da imagem sem ruido e redimencionada para 70x70
        const thresholded = blurred.resize(70,70).threshold(
          200,
          255,
          cv.THRESH_BINARY
        );


        // Substitui a imagem original pela imagem já borrada
        cv.imwrite(req.file.path, blurred);

        // Pega os valores de cada pixel da imagem e gera uma matriz 
        const matAsMatrix = thresholded.getDataAsArray();

        // Essa matriz de pixels é convertida em um array
        var matAsArray = [];
        for (var i = 0; i < matAsMatrix.length; i++){
            matAsArray = matAsArray.concat(matAsMatrix[i]);
        }

        // E assim normalizo os dados para assim ocupar menos memória
        const arrayNormalized = matAsArray.map(function(num) {
            return num === 255 ? 1 : 0;
        });

        // Converto o array normalizado em buffer, para assim salvar no banco de dados
        const buffer = Buffer.from(arrayNormalized);
        

//------------------------PROCESSAMENTO DE IMAGEM PARA PROJETOS FUTUROS-------------------------// 
// Aqui desenvolvi alguns métodos a mais que possa gerar dados que melhorem o treinamento da RNA.

        // Gera o contorno da mão
        const getHandContour = (handMask) => {
            const contours = thresholded.findContours(
              cv.RETR_EXTERNAL,
              cv.CHAIN_APPROX_SIMPLE
            );
            
            return contours.sort((c0, c1) => c1.area - c0.area)[0];
            
            // Retorna tipo isso
            // Contour {
            //     hierarchy: Vec4 { z: -1, y: -1, x: 97, w: 99 },
            //     numPoints: 1546,
            //     area: 193361,
            //     isConvex: false }
            // }
        };
        

        // Retorna a distância entre dois pontos
        const ptDist = (pt1, pt2) => pt1.sub(pt2).norm();

        // Retorna o centro de todos os pontos
        const getCenterPt = pts => pts.reduce(
            (sum, pt) => sum.add(pt),
            new cv.Point(0, 0)
            ).div(pts.length);

        // Pega o poligono do contorno da mão, de modo que haja
        // apenas um único ponto do contorno para a vizinhança local
        const getRoughHull = (contour, maxDist) => {
            // Pega os indices e os pontos do contorno da mão
            const hullIndices = contour.convexHullIndices();
            const contourPoints = contour.getPoints();
            const hullPointsWithIdx = hullIndices.map(idx => ({
                 pt: contourPoints[idx],
                 contourIdx: idx
             }));
            const hullPoints = hullPointsWithIdx.map(ptWithIdx => ptWithIdx.pt);
            
            // Agrupa todos os pontos da vizinhança local
            const ptsBelongToSameCluster = (pt1, pt2) => ptDist(pt1, pt2) < maxDist;
            const { labels } = cv.partition(hullPoints, ptsBelongToSameCluster);
            const pointsByLabel = new Map();
            labels.forEach(l => pointsByLabel.set(l, []));
            hullPointsWithIdx.forEach((ptWithIdx, i) => {
                const label = labels[i];
                pointsByLabel.get(label).push(ptWithIdx);
            });
  
            // Mapeia os pontos na vizinhança local para o ponto mais central
            const getMostCentralPoint = (pointGroup) => {
                // Identifica o centro
                const center = getCenterPt(pointGroup.map(ptWithIdx => ptWithIdx.pt));
                // Ordena ascendente por distância ao centro
                return pointGroup.sort(
                    (ptWithIdx1, ptWithIdx2) => ptDist(ptWithIdx1.pt, center) - ptDist(ptWithIdx2.pt, center)
                    )[0];
            };
            const pointGroups = Array.from(pointsByLabel.values());
            // Retornar os índices do contorno da maioria dos pontos centrais
            return pointGroups.map(getMostCentralPoint).map(ptWithIdx => ptWithIdx.contourIdx);
        };

        const getHullDefectVertices = (handContour, hullIndices) => {
            const defects = handContour.convexityDefects(hullIndices);
            const handContourPoints = handContour.getPoints();

            // Obtem os pontos mais altos
            const hullPointDefectNeighbors = new Map(hullIndices.map(idx => [idx, []]));
            defects.forEach((defect) => {
                const startPointIdx = defect.at(0);
                const endPointIdx = defect.at(1);
                const defectPointIdx = defect.at(2);
                hullPointDefectNeighbors.get(startPointIdx).push(defectPointIdx);
                hullPointDefectNeighbors.get(endPointIdx).push(defectPointIdx);
            });

            return Array.from(hullPointDefectNeighbors.keys())
               .filter(hullIndex => hullPointDefectNeighbors.get(hullIndex).length > 1)
               .map((hullIndex) => {
                    const defectNeighborsIdx = hullPointDefectNeighbors.get(hullIndex);
                    return ({
                        pt: handContourPoints[hullIndex],
                        d1: handContourPoints[defectNeighborsIdx[0]],
                        d2: handContourPoints[defectNeighborsIdx[1]]
                    });
                });
        };

        const filterVerticesByAngle = (vertices, maxAngleDeg) =>
            vertices.filter((v) => {
                const sq = x => x * x;
                const a = v.d1.sub(v.d2).norm();
                const b = v.pt.sub(v.d1).norm();
                const c = v.pt.sub(v.d2).norm();
                const angleDeg = Math.acos(((sq(b) + sq(c)) - sq(a)) / (2 * b * c)) * (180 / Math.PI);
                return angleDeg < maxAngleDeg;
            });

        //main

        const blue = new cv.Vec(255, 0, 0);
        const green = new cv.Vec(0, 255, 0);
        const red = new cv.Vec(0, 0, 255);

        const maxPointDist = 25;
        const handContour = getHandContour(thresholded);
        const edgePoints = handContour.getPoints();
        const hullIndices = getRoughHull(handContour, maxPointDist);
        const vertices = getHullDefectVertices(handContour, hullIndices);
        
        // Pontos da ponta do dedo são aqueles que têm um ângulo agudo em relação aos seus pontos de defeito
        const maxAngleDeg = 90;
        const verticesWithValidAngle = filterVerticesByAngle(vertices, maxAngleDeg);
        console.log(verticesWithValidAngle);
        
        const result = mat.copy();

        //Desenha as pontas dos dedos
        verticesWithValidAngle.forEach((v) => {
            mat.drawLine(
                v.pt,
                v.d1,
                { color: green, thickness: 2 }
            );
            mat.drawLine(
                v.pt,
                v.d2,
                { color: green, thickness: 2 }
            );
            mat.drawEllipse(
                new cv.RotatedRect(v.pt, new cv.Size(20, 20), 0),
                    { color: red, thickness: 2 }
                );
            result.drawEllipse(
                new cv.RotatedRect(v.pt, new cv.Size(20, 20), 0),
                    { color: red, thickness: 2 }
                );
        });
        
        //Faz o desenho do contorno da mão
        mat.drawContours(
            [edgePoints],
            0,
            green,
            { thickness: 2 }
        );
        
        
//-----------------------TERMINO DO PROCESSAMENTO DE IMAGEM----------------------------//

       
        //Salva a imagem borrada no local upload/backup. Assim se precisar alterar o tamanho da imagem e fazer o thresholded, será possivel.
        await sharp(req.file.path) //req.file.path
            //.resize(500)
            //.jpeg({ quality: 70 })
            .toFile(
                path.resolve(req.file.destination, 'backup' , fileName) 
            );
        console.log(req.file.destination);

        cv.imwrite(req.file.path, thresholded);
        //deleta a imagem do uploads, e assim deixando somente a imagem borrada salva
        //fs.unlinkSync(req.file.path);
        
        //salva no banco de dados
        const post = await Post.create({
            sign,
            image: fileName,
            binarry: buffer,
        });

        return res.json(post);
    }
};